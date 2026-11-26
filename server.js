const express = require("express");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const bcrypt = require("bcrypt");
const { randomBytes } = require("node:crypto");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Connect to the local MongoDB server and use the forum database.
const client = new MongoClient(
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
  {
    serverSelectionTimeoutMS: 5000,
  },
);
const forum = client.db("forum");
const posts = forum.collection("posts");
const users = forum.collection("users");
const sessions = forum.collection("sessions");
const usernamePattern = /^[a-z0-9_]{3,30}$/;

const sessionSecret = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === "production" && !sessionSecret) {
  throw new Error("Set SESSION_SECRET before starting the app in production.");
}

// The browser keeps a signed session ID. MongoDB keeps the session data.
app.use(
  session({
    secret: sessionSecret || randomBytes(32).toString("hex"),
    store: MongoStore.create({
      client,
      dbName: forum.databaseName,
      collectionName: sessions.collectionName,
      autoRemove: "disabled",
      touchAfter: 3600,
    }),
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: "lax", httpOnly: true },
  }),
);

// Load the current user before routes or EJS templates use it.
app.use(async (req, res, next) => {
  req.user = null;
  const { userId } = req.session;
  if (userId) {
    // Load the signed-in user from the database.
    try {
      const user = await users.findOne(
        { _id: new ObjectId(userId) },
        { projection: { username: 1 } },
      );
      if (user) {
        req.user = { id: user._id.toString(), username: user.username };
      }
    } catch (error) {
      console.error("Could not load the signed-in user.", error);
    }
  }
  res.locals.user = req.user;
  next();
});

function normalizeUsername(username) {
  return typeof username === "string" ? username.trim().toLowerCase() : "";
}

function isValidPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    Buffer.byteLength(password) <= 72
  );
}

function showAuth(res, signup, error = "", status = 200, username = "") {
  res.status(status).render("auth", { signup, error, username });
}

function logIn(req, res, next, user) {
  // Give the authenticated user a fresh session ID.
  req.session.regenerate((error) => {
    if (error) return next(error);
    req.session.userId = user._id.toString();
    req.session.save((error) => {
      if (error) return next(error);
      res.redirect(303, "/");
    });
  });
}

app.get("/signup", (req, res) => showAuth(res, true));
app.get("/login", (req, res) => showAuth(res, false));

app.post("/signup", async (req, res, next) => {
  const { username: input, password } = req.body || {};
  const username = normalizeUsername(input);
  if (!usernamePattern.test(username)) {
    return showAuth(
      res,
      true,
      "Use 3 to 30 letters, numbers, or underscores for your username.",
      400,
    );
  }
  if (!isValidPassword(password)) {
    return showAuth(
      res,
      true,
      "Use at least 8 characters and at most 72 bytes for your password.",
      400,
      username,
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = { username, passwordHash };
  try {
    await users.insertOne(user);
  } catch (error) {
    if (error.code !== 11000) throw error;
    return showAuth(
      res,
      true,
      "That username is already taken.",
      409,
      username,
    );
  }
  logIn(req, res, next, user);
});

app.post("/login", async (req, res, next) => {
  const { username: input, password } = req.body || {};
  const username = normalizeUsername(input);
  if (usernamePattern.test(username) && isValidPassword(password)) {
    const user = await users.findOne({ username });
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      return logIn(req, res, next, user);
    }
  }
  showAuth(res, false, "Incorrect username or password.", 401, username);
});

app.post("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("connect.sid");
    res.redirect(303, "/");
  });
});

function requireLogin(req, res, next) {
  if (!req.user) return res.status(401).send("Log in to manage posts.");
  next();
}

function readFeed() {
  return posts.find().sort({ createdAt: -1, _id: -1 }).toArray();
}

async function renderFeed(res, status = 200) {
  res.status(status).render("index", { posts: await readFeed(), error: "", text: "" });
}

app.get(["/", "/index.html"], (req, res) => renderFeed(res));

app.get("/posts", async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.render("posts", { posts: await readFeed() });
});

app.post("/posts", requireLogin, async (req, res) => {
  const input = req.body?.text;
  const text = typeof input === "string" ? input.trim() : "";
  if (!text || text.length > 1000) {
    return res.status(400).send("Write a post between 1 and 1000 characters.");
  }
  const { username, id } = req.user;
  await posts.insertOne({
    author: username,
    authorId: new ObjectId(id),
    text,
    createdAt: new Date().toISOString(),
  });
  await renderFeed(res, 201);
});

app.post("/posts/:id/delete", requireLogin, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send("Invalid post ID.");
  }
  const result = await posts.deleteOne({
    _id: new ObjectId(req.params.id),
    authorId: new ObjectId(req.user.id),
  });
  if (result.deletedCount === 0) {
    return res.status(404).send("Post not found.");
  }
  res.status(204).end();
});

// GET /styles.css: serve the stylesheet.
app.get("/styles.css", (req, res) => {
  res.sendFile("styles.css", { root: "." });
});

// Serve images and other static files under /assets.
app.use("/assets", express.static("public/assets"));

// Express 5 sends errors from async routes to this handler.
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).send("Something went wrong. Please try again.");
});

// Start accepting requests only after MongoDB connects.
async function start() {
  try {
    await client.connect();
    // Create a unique index on the username field to prevent duplicate usernames.
    await users.createIndex({ username: 1 }, { unique: true });
    // MongoDB removes sessions after their stored expiration date.
    await sessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
    console.log("Connected to MongoDB (forum database)");
    const port = Number(process.env.PORT || 8080);
    const server = app.listen(port, () => {
      console.log(`App running at http://localhost:${server.address().port}`);
    });
    server.on("error", async (error) => {
      console.error(error.message);
      await client.close();
      process.exitCode = 1;
    });
  } catch (error) {
    console.error("Could not connect to MongoDB. Make sure it is running.");
    console.error(error.message);
    await client.close();
    process.exitCode = 1;
  }
}

start();
