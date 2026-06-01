const API_URL = '/.netlify/functions/github';
const RATE_LIMIT_MS = 60000;

let currentLikes = 0;
let userLiked = false;

function checkRateLimit() {
  const lastComment = localStorage.getItem('lastCommentTime');
  if (!lastComment) return { canComment: true, waitTime: 0 };
  
  const timeDiff = Date.now() - parseInt(lastComment);
  const canComment = timeDiff >= RATE_LIMIT_MS;
  const waitTime = Math.ceil((RATE_LIMIT_MS - timeDiff) / 1000);
  
  return { canComment, waitTime };
}

function updateRateLimitUI() {
  const { canComment, waitTime } = checkRateLimit();
  const btn = document.getElementById('comment-btn');
  const msg = document.getElementById('rate-limit-msg');
  
  if (canComment) {
    btn.disabled = false;
    msg.textContent = '';
  } else {
    btn.disabled = true;
    msg.textContent = `Aguarde ${waitTime}s para comentar novamente`;
    setTimeout(updateRateLimitUI, 1000);
  }
}

async function loadData() {
  try {
    const res = await fetch(API_URL);
    const { issue, comments, reactions } = await res.json();

    document.getElementById('post-title').textContent = issue.title;
    document.getElementById('post-body').textContent = issue.body;

    currentLikes = reactions.filter(r => r.content === 'heart').length;
    document.getElementById('like-count').textContent = currentLikes;

    document.getElementById('comment-count').textContent = `(${comments.length})`;
    const commentsList = document.getElementById('comments-list');

    if (comments.length === 0) {
      commentsList.innerHTML = '<p class="loading">Seja o primeiro a comentar!</p>';
      return;
    }

    commentsList.innerHTML = comments.map(comment => `
      <div class="comment">
        <img src="${comment.user.avatar_url}" alt="${comment.user.login}">
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-author">${comment.user.login}</span>
            <span class="comment-date">${new Date(comment.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          <div class="comment-body">${comment.body.replace(/\n/g, '<br>')}</div>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Erro ao carregar:', error);
    document.getElementById('comments-list').innerHTML = '<p class="loading">Erro ao carregar. Verifique as variáveis de ambiente.</p>';
  }
}

document.getElementById('like-btn').addEventListener('click', async () => {
  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'react' })
    });
    currentLikes++;
    document.getElementById('like-count').textContent = currentLikes;
    document.getElementById('like-btn').classList.add('liked');
  } catch (error) {
    alert('Erro ao curtir. Verifique se o GITHUB_TOKEN está configurado no Netlify.');
  }
});

document.getElementById('comment-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const { canComment } = checkRateLimit();
  if (!canComment) {
    updateRateLimitUI();
    return;
  }
  
  const nameInput = document.getElementById('comment-name');
  const emailInput = document.getElementById('comment-email');
  const bodyInput = document.getElementById('comment-input');
  
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const body = bodyInput.value.trim();

  if (!name || !body) return;

  const commentsList = document.getElementById('comments-list');
  const tempComment = document.createElement('div');
  tempComment.className = 'comment';
  tempComment.style.opacity = '0.6';
  tempComment.innerHTML = `
    <img src="https://github.com/identicons/${name}.png" alt="${name}">
    <div class="comment-content">
      <div class="comment-header">
        <span class="comment-author">${name}</span>
        <span class="comment-date">agora</span>
      </div>
      <div class="comment-body">${email ? `<strong>${email}</strong><br>` : ''}${body.replace(/\n/g, '<br>')}</div>
    </div>
  `;
  
  if (commentsList.querySelector('.loading')) {
    commentsList.innerHTML = '';
  }
  commentsList.prepend(tempComment);

  nameInput.value = '';
  emailInput.value = '';
  bodyInput.value = '';
  localStorage.setItem('lastCommentTime', Date.now());
  updateRateLimitUI();

  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'comment', name, email, body })
    });
    
    setTimeout(() => {
      loadData();
    }, 1500);
    
  } catch (error) {
    alert('Erro ao comentar. Recarregue a página.');
    tempComment.remove();
  }
});

updateRateLimitUI();
loadData();
