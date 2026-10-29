const express = require("express");
const path = require("path");

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Keep posts in memory for this lecture. Restarting the server resets them.
const posts = [
  {
    id: 2,
    author: "ava",
    text: "A walk through the city.",
    createdAt: "2026-01-02T12:00:00Z",
    image: "/assets/city.svg",
    imageAlt: "Illustration of a city at sunset",
  },
  {
    id: 1,
    author: "minho",
    text: "One coffee, one new idea.",
    createdAt: "2026-01-01T12:00:00Z",
    image: "/assets/coffee.svg",
    imageAlt: "Illustration of coffee on a table",
  },
];
let nextId = 4;

// GET / or /index.html: render the feed with EJS.
app.get(["/", "/index.html"], (req, res) => {
  res.render("index", { posts, error: "", text: "" });
});

// POST /posts: accept the post form and redirect to the feed, or show a validation error.
app.post("/posts", (req, res) => {
  const text = req.body?.text;
  if (typeof text !== "string" || !text.trim() || text.trim().length > 1000) {
    return res.status(400).render("index", {
      posts,
      error: "Write a post between 1 and 1000 characters.",
      text: typeof text === "string" ? text : "",
    });
  }
  // Add the new post to the front of the array and redirect to the feed.
  posts.unshift({
    id: nextId++,
    author: "tom",
    text: text.trim(),
    createdAt: new Date().toISOString(),
  });
  res.redirect(303, "/");
});

// Delete a post from memory. The browser updates the page itself.
app.post("/posts/:id/delete", (req, res) => {
  const index = posts.findIndex((post) => String(post.id) === req.params.id);
  if (index === -1) {
    return res.status(404).send("Post not found.");
  }
  // Remove the post from the array.
  posts.splice(index, 1);
  // Return 204 No Content to indicate success without a response body.
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

app.listen(8080, () => {
  console.log("App running at http://localhost:8080");
});
