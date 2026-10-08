const feed = document.querySelector('#posts');
const status = document.querySelector('#status');
const form = document.querySelector('#post-form');
const postText = document.querySelector('#post-text');
const publishButton = form.querySelector('button');

function renderPost(post) {
  const article = document.createElement('article');
  article.className = 'post';
  article.innerHTML = '<header class="post-header"><strong></strong><time></time></header><div class="post-body"><p class="post-caption"></p></div>';
  article.querySelector('strong').textContent = `@${post.author}`;
  const time = article.querySelector('time');
  time.dateTime = post.createdAt;
  time.textContent = new Date(post.createdAt).toLocaleDateString();
  article.querySelector('.post-caption').textContent = post.text;
  if (post.image) {
    const image = document.createElement('img');
    image.className = 'post-image';
    image.src = post.image;
    image.alt = post.imageAlt;
    article.querySelector('.post-body').before(image);
  }
  return article;
}

async function loadPosts() {
  publishButton.disabled = true;
  try {
    const response = await fetch('/api/posts');
    if (!response.ok) throw new Error('Could not load posts.');
    const posts = await response.json();
    feed.replaceChildren(...posts.map(renderPost));
  } catch (error) {
    status.textContent = error.message;
  } finally {
    publishButton.disabled = false;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  publishButton.disabled = true;
  status.textContent = '';
  try {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: postText.value }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not publish post.');
    feed.prepend(renderPost(result));
    form.reset();
  } catch (error) {
    status.textContent = error.message;
  } finally {
    publishButton.disabled = false;
  }
});

loadPosts();
