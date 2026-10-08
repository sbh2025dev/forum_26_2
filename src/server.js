const express = require('express');

const app = express();

app.get(['/', '/index.html'], (req, res) => {
  res.sendFile('index.html', { root: '.' });
});

app.get('/profile.html', (req, res) => {
  res.sendFile('profile.html', { root: '.' });
});

app.get('/styles.css', (req, res) => {
  res.sendFile('styles.css', { root: '.' });
});

app.use('/assets', express.static('public/assets'));

app.listen(8080, () => {
  console.log('App running at http://localhost:8080');
});
