const API_URL = '/.netlify/functions/github';
const RATE_LIMIT_MS = 60000;

let currentLikes = 0;

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
  const btn = document.getElementById('like-btn');
  btn.disabled = true;
  
  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'react' })
    });
    currentLikes++;
    document.getElementById('like-count').textContent = currentLikes;
    btn.classList.add('liked');
  } catch (error) {
    alert('Erro ao curtir. Verifique o token no Netlify.');
    btn.disabled = false;
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
  const btn = document.getElementById('comment-btn');
  
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const body = bodyInput.value.trim();

  if (!name || !body) return;

  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'comment', name, email, body })
    });

    if (!res.ok) throw new Error('Falha ao enviar');

    // Só limpa e trava SE deu certo
    nameInput.value = '';
    emailInput.value = '';
    bodyInput.value = '';
    localStorage.setItem('lastCommentTime', Date.now());
    updateRateLimitUI();
    
    // Recarrega comentários depois de 1s
    setTimeout(() => {
      loadData();
    }, 1000);
    
  } catch (error) {
    alert('Erro ao comentar. Tente novamente.');
    console.error(error);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Comentar';
  }
});

updateRateLimitUI();
loadData();
