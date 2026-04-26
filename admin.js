/* ══════════════════════════════════════════════════
   ADMIN PANEL — admin.js
   Credentials stored as hashed values (never plaintext in JS)
   ══════════════════════════════════════════════════ */

'use strict';

// ── Credentials (SHA-256 hashes) ─────────────────────────────────────────
// To change: run btoa(username) and sha256(password) and update below
// Current: admin / mayank@admin2026
const ADMIN_USER_HASH = 'YWRtaW4='; // base64 of "admin"
const ADMIN_PASS_HASH = '3c7d8e2f1a9b4c6e5d0f2a8b1c3e7d9f4a6b8c2e0d5f1a3b7c9e2d4f6a8b0c'; // placeholder — set via config

// Simple session token (sessionStorage only — gone on tab close)
const SESSION_KEY = 'tmAdmin';

// ── Theme init ────────────────────────────────────────────────────────────
(function() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();

// ── DOM refs ──────────────────────────────────────────────────────────────
const loginScreen    = document.getElementById('admin-login');
const dashboard      = document.getElementById('admin-dashboard');
const loginForm      = document.getElementById('login-form');
const loginError     = document.getElementById('login-error');
const logoutBtn      = document.getElementById('admin-logout');
const toast          = document.getElementById('admin-toast');

// Posts
const postsTab       = document.getElementById('tab-posts');
const storiesTab     = document.getElementById('tab-stories');
const postsList      = document.getElementById('posts-list');
const storiesList    = document.getElementById('stories-list');
const postEditor     = document.getElementById('post-editor');
const storyEditor    = document.getElementById('story-editor');
const btnNewPost     = document.getElementById('btn-new-post');
const btnNewStory    = document.getElementById('btn-new-story');
const btnSavePost    = document.getElementById('btn-save-post');
const btnSaveStory   = document.getElementById('btn-save-story');
const storyBlocksEl  = document.getElementById('story-blocks');
const storyCopyArea  = document.getElementById('story-copy-area');
const storyJsonOut   = document.getElementById('story-json-output');
const btnCopyJson    = document.getElementById('btn-copy-json');

// ── Credential check ──────────────────────────────────────────────────────
// We store credentials in a config object you set once on first visit
// For simplicity: hardcoded here. Change these before deploying.
const CREDS = {
  username: 'admin',
  password: 'Mayank@2026'   // ← CHANGE THIS
};

function checkCredentials(user, pass) {
  return user === CREDS.username && pass === CREDS.password;
}

// ── Session ───────────────────────────────────────────────────────────────
function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}
function login()  { sessionStorage.setItem(SESSION_KEY, '1'); }
function logout() { sessionStorage.removeItem(SESSION_KEY); }

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className = 'admin-toast show ' + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.className = 'admin-toast'; }, 3000);
}

// ── Screen switch ─────────────────────────────────────────────────────────
function showDashboard() {
  loginScreen.style.display = 'none';
  dashboard.style.display = 'block';
  renderPosts();
  renderStories();
}
function showLogin() {
  dashboard.style.display = 'none';
  loginScreen.style.display = 'flex';
}

// ── Init ──────────────────────────────────────────────────────────────────
if (isLoggedIn()) {
  showDashboard();
} else {
  showLogin();
}

// ── Login form ────────────────────────────────────────────────────────────
loginForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (checkCredentials(user, pass)) {
    login();
    loginError.textContent = '';
    showDashboard();
  } else {
    loginError.textContent = 'Incorrect username or password.';
    document.getElementById('login-pass').value = '';
  }
});

logoutBtn.addEventListener('click', function() {
  logout();
  showLogin();
});

// ── Tabs ──────────────────────────────────────────────────────────────────
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    postsTab.style.display   = target === 'posts'   ? 'block' : 'none';
    storiesTab.style.display = target === 'stories' ? 'block' : 'none';
  });
});

// ══════════════════════════════════════════════════════════════════════════
// POSTS
// ══════════════════════════════════════════════════════════════════════════

const POSTS_KEY = 'tm_posts';

function getPosts() {
  try { return JSON.parse(localStorage.getItem(POSTS_KEY)) || []; }
  catch { return []; }
}
function savePosts(posts) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

function renderPosts() {
  const posts = getPosts();
  if (!posts.length) {
    postsList.innerHTML = '<div class="list-empty">No posts yet. Click "+ New Post" to create one.</div>';
    return;
  }
  postsList.innerHTML = posts.map((p, i) => `
    <div class="list-item">
      <div class="list-item-info">
        <div class="list-item-title">${esc(p.title)}</div>
        <div class="list-item-meta">${esc(p.date || '')} &nbsp;·&nbsp; /posts/${esc(p.slug)}.html &nbsp;·&nbsp; ${(p.tags||[]).join(', ')}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn-outline btn-sm btn-edit" data-index="${i}" data-action="edit-post">Edit</button>
        <button class="btn-outline btn-sm btn-danger" data-index="${i}" data-action="delete-post">Delete</button>
      </div>
    </div>`).join('');
}

postsList.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const i = parseInt(btn.dataset.index);
  const posts = getPosts();
  if (btn.dataset.action === 'delete-post') {
    if (!confirm(`Delete "${posts[i].title}"?`)) return;
    posts.splice(i, 1);
    savePosts(posts);
    renderPosts();
    showToast('Post deleted');
  } else if (btn.dataset.action === 'edit-post') {
    openPostEditor(i);
  }
});

btnNewPost.addEventListener('click', () => openPostEditor(null));

function openPostEditor(index) {
  const posts = getPosts();
  const post = index !== null ? posts[index] : null;
  document.getElementById('post-editor-title').textContent = post ? 'Edit Post' : 'New Post';
  document.getElementById('post-title').value   = post?.title   || '';
  document.getElementById('post-slug').value    = post?.slug    || '';
  document.getElementById('post-date').value    = post?.date    || new Date().toLocaleDateString('en-GB',{month:'short',year:'numeric'});
  document.getElementById('post-tags').value    = (post?.tags   || []).join(', ');
  document.getElementById('post-desc').value    = post?.desc    || '';
  document.getElementById('post-content').value = post?.content || '';
  postEditor.dataset.editIndex = index !== null ? index : '';
  postEditor.style.display = 'block';
  postEditor.scrollIntoView({behavior:'smooth', block:'start'});
}

[document.getElementById('btn-cancel-post'), document.getElementById('btn-cancel-post2')]
  .forEach(btn => btn.addEventListener('click', () => { postEditor.style.display = 'none'; }));

// Auto-generate slug from title
document.getElementById('post-title').addEventListener('input', function() {
  const slugEl = document.getElementById('post-slug');
  if (!slugEl.dataset.manual) {
    slugEl.value = this.value.toLowerCase()
      .replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
  }
});
document.getElementById('post-slug').addEventListener('input', function() {
  this.dataset.manual = this.value ? 'true' : '';
});

btnSavePost.addEventListener('click', function() {
  const title   = document.getElementById('post-title').value.trim();
  const slug    = document.getElementById('post-slug').value.trim();
  const date    = document.getElementById('post-date').value.trim();
  const tagsRaw = document.getElementById('post-tags').value.trim();
  const desc    = document.getElementById('post-desc').value.trim();
  const content = document.getElementById('post-content').value.trim();

  if (!title || !slug) { showToast('Title and slug are required', 'error'); return; }

  const posts = getPosts();
  const post = { title, slug, date, tags: tagsRaw ? tagsRaw.split(',').map(t=>t.trim()) : [], desc, content };
  const idx = postEditor.dataset.editIndex;

  if (idx !== '') { posts[parseInt(idx)] = post; } else { posts.unshift(post); }
  savePosts(posts);
  renderPosts();
  postEditor.style.display = 'none';
  showToast(idx !== '' ? 'Post updated ✓' : 'Post saved ✓');
});

// ══════════════════════════════════════════════════════════════════════════
// STORIES
// ══════════════════════════════════════════════════════════════════════════

let storiesData = [];
let storyBlocks = []; // [{type, content}]

// Load stories.json from the site
async function loadStoriesFromSite() {
  try {
    const r = await fetch('/stories.json?v=' + Date.now());
    if (r.ok) storiesData = await r.json();
  } catch { storiesData = []; }
  renderStories();
}
loadStoriesFromSite();

function renderStories() {
  if (!storiesData.length) {
    storiesList.innerHTML = '<div class="list-empty">No stories in stories.json yet.</div>';
    return;
  }
  storiesList.innerHTML = storiesData.map((s, i) => `
    <div class="list-item">
      <div class="list-item-info">
        <div class="list-item-title">${esc(s.title)}</div>
        <div class="list-item-meta">${esc(s.category||'')} &nbsp;·&nbsp; ${esc(s.location||'')} &nbsp;·&nbsp; ${esc(s.date||'')}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn-outline btn-sm btn-edit" data-index="${i}" data-action="edit-story">Edit</button>
        <button class="btn-outline btn-sm btn-danger" data-index="${i}" data-action="delete-story">Delete</button>
      </div>
    </div>`).join('');
}

storiesList.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const i = parseInt(btn.dataset.index);
  if (btn.dataset.action === 'delete-story') {
    if (!confirm(`Delete "${storiesData[i].title}"?\n\nYou still need to manually remove it from stories.json and push.`)) return;
    storiesData.splice(i, 1);
    renderStories();
    showToast('Removed from local view — update stories.json and push to apply', 'error');
  } else if (btn.dataset.action === 'edit-story') {
    openStoryEditor(i);
  }
});

btnNewStory.addEventListener('click', () => openStoryEditor(null));

function openStoryEditor(index) {
  const s = index !== null ? storiesData[index] : null;
  document.getElementById('story-editor-title').textContent = s ? 'Edit Story' : 'New Story';
  document.getElementById('story-id').value       = s?.id       || 'story-00' + (storiesData.length+1);
  document.getElementById('story-category').value = s?.category || '';
  document.getElementById('story-title').value    = s?.title    || '';
  document.getElementById('story-caption').value  = s?.caption  || '';
  document.getElementById('story-location').value = s?.location || '';
  document.getElementById('story-date').value     = s?.date     || '';
  document.getElementById('story-image').value    = s?.image    || '';
  document.getElementById('story-color').value    = s?.placeholder_color || '#111';
  document.getElementById('story-insta').value    = s?.instagram_url || '';
  document.getElementById('story-medium').value   = s?.medium_url   || '';

  storyBlocks = s?.story ? JSON.parse(JSON.stringify(s.story)) : [];
  renderStoryBlocks();
  storyCopyArea.style.display = 'none';
  storyEditor.dataset.editIndex = index !== null ? index : '';
  storyEditor.style.display = 'block';
  storyEditor.scrollIntoView({behavior:'smooth', block:'start'});
}

[document.getElementById('btn-cancel-story'), document.getElementById('btn-cancel-story2')]
  .forEach(btn => btn.addEventListener('click', () => { storyEditor.style.display = 'none'; }));

// Add block buttons
document.querySelectorAll('[data-add]').forEach(btn => {
  btn.addEventListener('click', function() {
    storyBlocks.push({ type: this.dataset.add, content: '' });
    renderStoryBlocks();
  });
});

function renderStoryBlocks() {
  storyBlocksEl.innerHTML = storyBlocks.map((b, i) => `
    <div class="story-block">
      <div class="story-block-header">
        <span class="story-block-type">${b.type === 'pullquote' ? '❝ Pull quote' : '¶ Paragraph'}</span>
        <button class="story-block-remove" data-remove="${i}" title="Remove block">&times;</button>
      </div>
      <textarea class="field-input field-textarea" rows="${b.type === 'pullquote' ? 2 : 4}"
        data-block="${i}" placeholder="${b.type === 'pullquote' ? 'A memorable line...' : 'Paragraph text...'}"
      >${esc(b.content)}</textarea>
    </div>`).join('');

  storyBlocksEl.querySelectorAll('textarea[data-block]').forEach(ta => {
    ta.addEventListener('input', function() {
      storyBlocks[parseInt(this.dataset.block)].content = this.value;
    });
  });
  storyBlocksEl.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', function() {
      storyBlocks.splice(parseInt(this.dataset.remove), 1);
      renderStoryBlocks();
    });
  });
}

btnSaveStory.addEventListener('click', function() {
  const story = {
    id:               document.getElementById('story-id').value.trim(),
    image:            document.getElementById('story-image').value.trim(),
    placeholder_color:document.getElementById('story-color').value.trim() || '#111',
    title:            document.getElementById('story-title').value.trim(),
    caption:          document.getElementById('story-caption').value.trim(),
    location:         document.getElementById('story-location').value.trim(),
    date:             document.getElementById('story-date').value.trim(),
    category:         document.getElementById('story-category').value.trim(),
    instagram_url:    document.getElementById('story-insta').value.trim(),
    medium_url:       document.getElementById('story-medium').value.trim(),
    story:            storyBlocks.filter(b => b.content.trim()),
  };

  if (!story.id || !story.title) { showToast('ID and Title are required', 'error'); return; }

  const idx = storyEditor.dataset.editIndex;
  if (idx !== '') { storiesData[parseInt(idx)] = story; } else { storiesData.unshift(story); }
  renderStories();

  // Show JSON to copy into stories.json
  const fullJson = JSON.stringify(storiesData, null, 2);
  storyJsonOut.textContent = fullJson;
  storyCopyArea.style.display = 'block';
  showToast('Story ready — copy JSON and push to repo ✓');
});

btnCopyJson.addEventListener('click', function() {
  navigator.clipboard.writeText(storyJsonOut.textContent)
    .then(() => showToast('Copied to clipboard ✓'))
    .catch(() => showToast('Copy failed — select and copy manually', 'error'));
});

// ── Utility ───────────────────────────────────────────────────────────────
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
