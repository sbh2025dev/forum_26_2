const express = require("express");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Connect to the local MongoDB server and use the forum database.
const client = new MongoClient(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017", {
  serverSelectionTimeoutMS: 5000,
});
const posts = client.db("forum").collection("posts");

// GET / or /index.html: render the feed with EJS.
app.get(["/", "/index.html"], async (req, res) => {
  const feed = await posts.find().sort({ createdAt: -1, _id: -1 }).toArray();
  res.render("index", { posts: feed, error: "", text: "" });
});

// POST /posts: accept the post form and redirect to the feed, or show a validation error.
app.post("/posts", async (req, res) => {
  const text = req.body?.text;
  if (typeof text !== "string" || !text.trim() || text.trim().length > 1000) {
    const feed = await posts.find().sort({ createdAt: -1, _id: -1 }).toArray();
    return res.status(400).render("index", {
      posts: feed,
      error: "Write a post between 1 and 1000 characters.",
      text: typeof text === "string" ? text : "",
    });
  }
  // Save the post in MongoDB. MongoDB creates its _id automatically.
  await posts.insertOne({
    author: "ava",
    text: text.trim(),
    createdAt: new Date().toISOString(),
  });
  res.redirect(303, "/");
});

// Delete a post from MongoDB. The browser updates the page itself.
app.post("/posts/:id/delete", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send("Invalid post ID.");
  }
  const result = await posts.deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) {
    return res.status(404).send("Post not found.");
  }
  res.status(204).end();
});

// GET /profile.html: serve the profile page.
app.get("/profile.html", (req, res) => {
  res.sendFile("profile.html", { root: "." });
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
    console.log("Connected to MongoDB (forum database)");
    app.listen(8080, () => {
      console.log("App running at http://localhost:8080");
    });
  } catch (error) {
    console.error("Could not connect to MongoDB. Make sure it is running.");
    console.error(error.message);
    await client.close();
    process.exitCode = 1;
  }
}

start();
