const express = require('express');

const app = express();

app.use(express.json());

// Keep posts in memory for this lecture. Restarting the server resets them.
const posts = [
  { id: 2, author: 'ava', text: 'A walk through the city.', createdAt: '2026-01-02T12:00:00Z', image: '/assets/city.svg', imageAlt: 'Illustration of a city at sunset' },
  { id: 1, author: 'minho', text: 'One coffee, one new idea.', createdAt: '2026-01-01T12:00:00Z', image: '/assets/coffee.svg', imageAlt: 'Illustration of coffee on a table' },
];
let nextId = 3;

app.get('/api/posts', (req, res) => {
  res.json(posts);
});

app.post('/api/posts', (req, res) => {
  const text = req.body?.text;
  if (typeof text !== 'string' || !text.trim() || text.trim().length > 1000) {
    return res.status(400).json({ error: 'Write a post between 1 and 1000 characters.' });
  }

  const post = { id: nextId++, author: 'ava', text: text.trim(), createdAt: new Date().toISOString() };
  posts.unshift(post);
  res.status(201).json(post);
});

app.get(['/', '/index.html'], (req, res) => {
  res.sendFile('index.html', { root: '.' });
});

app.get('/profile.html', (req, res) => {
  res.sendFile('profile.html', { root: '.' });
});

app.get('/styles.css', (req, res) => {
  res.sendFile('styles.css', { root: '.' });
});

app.get('/posts.js', (req, res) => {
  res.sendFile('posts.js', { root: '.' });
});

app.use('/assets', express.static('public/assets'));

app.listen(8080, () => {
  console.log('App running at http://localhost:8080');
});
