'use strict';

// ── DOM ELEMENTS ─────────────────────────────────────────────────────────────
const datePicker = document.getElementById('date-picker');
const btnRefresh = document.getElementById('btn-refresh');

const tabs = {
  dashboard: document.getElementById('tab-dashboard'),
  messages: document.getElementById('tab-messages'),
  review: document.getElementById('tab-review'),
};
const navButtons = document.querySelectorAll('.nav-item');

const statsGrid = document.getElementById('stats-grid');
const urgentList = document.getElementById('urgent-list');
const allList = document.getElementById('all-list');
const reviewList = document.getElementById('review-list');

const urgentCount = document.getElementById('urgent-count');
const allCount = document.getElementById('all-count');
const reviewCount = document.getElementById('review-count');
const badgeErrors = document.getElementById('badge-errors');

const sseDot = document.querySelector('.sse-dot');
const sseLabel = document.querySelector('.sse-label');
const toastContainer = document.getElementById('toast-container');

const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

// ── STATE ────────────────────────────────────────────────────────────────────
let currentDate = new Date().toISOString().split('T')[0];
datePicker.value = currentDate;
let allMessages = [];
let urgentMessages = [];
let currentCategoryFilter = null;

// ── INIT ─────────────────────────────────────────────────────────────────────
function init() {
  setupTheme();
  setupTabs();
  setupEventListeners();
  setupSSE();
  fetchData();
}

// ── THEME ────────────────────────────────────────────────────────────────────
function setupTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (themeIcon) {
    themeIcon.textContent = savedTheme === 'light' ? '🌙' : '☀️';
  }
}

// ── TABS ─────────────────────────────────────────────────────────────────────
function setupTabs() {
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active de tudo
      navButtons.forEach(b => b.classList.remove('active'));
      Object.values(tabs).forEach(t => t.classList.remove('active'));
      
      // Adiciona active no clicado
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      tabs[tabId].classList.add('active');
    });
  });
}

// ── EVENT LISTENERS ──────────────────────────────────────────────────────────
function setupEventListeners() {
  datePicker.addEventListener('change', (e) => {
    currentDate = e.target.value;
    fetchData();
  });

  btnRefresh.addEventListener('click', () => {
    btnRefresh.classList.add('spinning');
    fetchData().finally(() => {
      setTimeout(() => btnRefresh.classList.remove('spinning'), 500);
    });
  });

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      themeIcon.textContent = newTheme === 'light' ? '🌙' : '☀️';
    });
  }

  // Filtro ao clicar nos cards de estatística
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', () => {
      const categoryId = card.id.replace('card-', '');
      
      // Se clicou na categoria que já está ativa, limpa o filtro
      if (currentCategoryFilter === categoryId) {
        currentCategoryFilter = null;
        document.getElementById('page-subtitle').textContent = 'Visão geral do dia';
        card.classList.remove('active');
      } else {
        currentCategoryFilter = categoryId;
        document.getElementById('page-subtitle').textContent = `Filtrando por: ${CAT_LABELS[categoryId] || categoryId} (clique no card novamente para limpar)`;
        
        document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      }
      
      applyFilterAndRender();
    });
  });

  // Limpa o filtro quando clica na aba "Mensagens" no menu lateral
  document.getElementById('nav-messages').addEventListener('click', () => {
    if (currentCategoryFilter) {
      currentCategoryFilter = null;
      document.getElementById('page-subtitle').textContent = 'Visão geral do dia';
      document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
      applyFilterAndRender();
    }
  });
}

// ── FETCH DATA ───────────────────────────────────────────────────────────────
async function fetchData() {
  try {
    await Promise.all([
      fetchStats(),
      fetchUrgent(),
      fetchAll(),
      fetchReview()
    ]);
  } catch (err) {
    showToast('Erro ao carregar dados: ' + err.message, 'error');
  }
}

async function fetchStats() {
  const res = await fetch(`/api/stats?date=${currentDate}`);
  const { data } = await res.json();
  
  // Reseta skeleton
  const cards = document.querySelectorAll('.stat-card');
  cards.forEach(c => {
    c.classList.remove('skeleton');
    c.querySelector('.card-count').textContent = '0';
  });

  if (data) {
    data.forEach(item => {
      const card = document.getElementById(`card-${item.categoria}`);
      if (card) {
        card.querySelector('.card-count').textContent = item.total;
      }
    });
  }
}

async function fetchUrgent() {
  const res = await fetch(`/api/messages/urgent?date=${currentDate}`);
  const { data } = await res.json();
  
  urgentMessages = data;
  applyFilterAndRender();
}

async function fetchAll() {
  const res = await fetch(`/api/messages?date=${currentDate}`);
  const { data } = await res.json();
  
  allMessages = data;
  applyFilterAndRender();
}

function applyFilterAndRender() {
  const dashTitle = document.getElementById('dashboard-list-title');

  if (currentCategoryFilter) {
    const filtered = allMessages.filter(m => m.categoria === currentCategoryFilter);
    urgentCount.textContent = filtered.length;
    dashTitle.innerHTML = `Filtro: ${CAT_LABELS[currentCategoryFilter] || currentCategoryFilter}`;
    renderMessages(filtered, urgentList, 'Nenhuma mensagem para este filtro no dia.');
  } else {
    urgentCount.textContent = urgentMessages.length;
    dashTitle.innerHTML = `🔴 Urgentes do Dia`;
    renderMessages(urgentMessages, urgentList, 'Nenhuma mensagem urgente hoje 🎉');
  }
  
  allCount.textContent = allMessages.length;
  renderMessages(allMessages, allList, 'Nenhuma mensagem encontrada para esta data.');
}

async function fetchReview() {
  const res = await fetch(`/api/messages/errors`);
  const { data } = await res.json();
  
  const count = data.length;
  reviewCount.textContent = count;
  
  if (count > 0) {
    badgeErrors.textContent = count;
    badgeErrors.classList.add('show');
  } else {
    badgeErrors.classList.remove('show');
  }

  renderMessages(data, reviewList, 'Nenhuma mensagem aguardando revisão ✅', true);
}

// ── RENDER ───────────────────────────────────────────────────────────────────
const CAT_LABELS = {
  urgente_prazo: 'Urgente',
  agendamento: 'Agendamento',
  duvida_processo: 'Dúvida',
  financeiro: 'Financeiro',
  documento_recebido: 'Documento',
  spam_irrelevante: 'Spam'
};

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateOnly(isoString) {
  if (!isoString) return '';
  const [year, month, day] = isoString.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
}

function renderMessages(messages, container, emptyText, isReview = false) {
  container.innerHTML = '';
  
  if (!messages || messages.length === 0) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }

  messages.forEach(msg => {
    const card = document.createElement('div');
    card.className = 'msg-card';
    card.setAttribute('data-cat', msg.categoria);
    
    let btnReviewHtml = '';
    if (isReview) {
      btnReviewHtml = `
        <div class="msg-actions">
          <button class="btn-revisado" onclick="markAsReviewed('${msg.id}', this)">
            ✓ Revisado
          </button>
        </div>
      `;
    }

    const clienteHtml = msg.cliente_nome ? msg.cliente_nome : `<span style="opacity:0.6">${msg.remetente}</span>`;
    const procHtml = msg.numero_processo ? `<span class="msg-proc">CNJ: ${msg.numero_processo}</span>` : '';
    const prazoHtml = msg.prazo_data ? `<span class="msg-prazo">Prazo: ${formatDateOnly(msg.prazo_data)}</span>` : '';
    
    let infoDivStyle = isReview ? 'grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px;' : 'display: flex; flex-direction: column; gap: 8px;';
    
    card.innerHTML = `
      <div style="${infoDivStyle}">
        <div class="msg-top">
          <span class="msg-sender">${clienteHtml}</span>
          <span class="msg-canal">${msg.canal}</span>
          <span class="msg-time">${formatDate(msg.recebido_em)}</span>
        </div>
        <div class="msg-body">${msg.resumo}</div>
        <div class="msg-meta">
          <span class="msg-tag tag-${msg.categoria}">${CAT_LABELS[msg.categoria] || msg.categoria}</span>
          <span class="msg-conf">Confiança: ${(msg.confianca * 100).toFixed(0)}%</span>
          ${procHtml}
          ${prazoHtml}
        </div>
      </div>
      ${btnReviewHtml}
    `;
    
    container.appendChild(card);
  });
}

// ── ACTIONS ──────────────────────────────────────────────────────────────────
window.markAsReviewed = async function(id, btnElement) {
  btnElement.disabled = true;
  btnElement.textContent = 'Processando...';

  try {
    const res = await fetch(`/api/messages/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'revisado' })
    });
    
    const json = await res.json();
    
    if (json.ok) {
      btnElement.textContent = '✓ Concluído';
      btnElement.classList.add('done');
      
      // Animação de saída e refresh da lista
      setTimeout(() => {
        fetchReview();
        showToast('Mensagem marcada como revisada.', 'success');
      }, 500);
    } else {
      throw new Error(json.error);
    }
  } catch (err) {
    btnElement.disabled = false;
    btnElement.textContent = '✓ Revisado';
    showToast('Erro ao atualizar status: ' + err.message, 'error');
  }
};

// ── SERVER-SENT EVENTS (SSE) ─────────────────────────────────────────────────
function setupSSE() {
  const eventSource = new EventSource('/api/events');
  
  eventSource.onopen = () => {
    sseDot.className = 'sse-dot connected';
    sseLabel.textContent = 'Conectado (Live)';
  };

  eventSource.onerror = () => {
    sseDot.className = 'sse-dot disconnected';
    sseLabel.textContent = 'Desconectado';
  };

  eventSource.addEventListener('new_message', (e) => {
    const msg = JSON.parse(e.data);
    
    showToast(`Nova mensagem de ${msg.remetente}`, 'info');
    
    // Se a data atual for hoje, atualiza a tela
    if (currentDate === new Date().toISOString().split('T')[0]) {
      fetchData();
    }
  });
}

// ── TOAST ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// Start
init();
