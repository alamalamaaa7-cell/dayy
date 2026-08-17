(function () {
  if (typeof io === 'undefined') return;
  var socket = io();
  window.SnapLamSocket = socket;

  var currentUser = document.body.dataset.username || '';
  var msgsEl = document.getElementById('chatMsgs');
  var inputEl = document.getElementById('chatInput');
  var sendBtn = document.getElementById('chatSendBtn');
  var onlineEl = document.getElementById('chatOnlineCount');
  var openChatBtn = document.getElementById('openChatBtn');
  var toastStack = document.getElementById('toastStack');

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function initials(name) {
    return (name || '?').trim().charAt(0).toUpperCase();
  }

  function fmtTime(iso) {
    var d = iso ? new Date(iso) : new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function markUnread() {
    if (document.body.classList.contains('chat-open')) return;
    if (openChatBtn) openChatBtn.classList.add('has-unread');
  }

  function addMsg(m) {
    if (!msgsEl) return;
    var own = m.username === currentUser;
    var crown = m.role === 'admin' ? '<span class="cm-crown" title="Admin">👑</span>' : '';

    var wrap = document.createElement('div');
    wrap.className = 'cm-msg ' + (own ? 'own' : 'other');
    wrap.innerHTML =
      '<div class="cm-avatar">' + esc(initials(m.username)) + '</div>' +
      '<div class="cm-col">' +
        (!own ? '<div class="cm-name">' + esc(m.username) + crown + '</div>' : '') +
        '<div class="cm-bubble">' + esc(m.message) + '</div>' +
        '<div class="cm-time">' + fmtTime(m.time) + '</div>' +
      '</div>';
    msgsEl.appendChild(wrap);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function addSystemLine(text) {
    if (!msgsEl) return;
    var div = document.createElement('div');
    div.className = 'cm-system';
    div.textContent = text;
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  socket.on('chat:history', function (history) {
    if (!msgsEl) return;
    msgsEl.innerHTML = '';
    history.forEach(function (m) {
      addMsg({ username: m.username, message: m.message, time: m.created_at });
    });
  });

  socket.on('chat:message', function (m) {
    addMsg(m);
    if (m.username !== currentUser) markUnread();
  });

  socket.on('chat:presence', function (data) {
    if (onlineEl && typeof data.online === 'number') onlineEl.textContent = data.online;
    if (data.username !== currentUser) {
      addSystemLine(data.username + (data.event === 'join' ? ' bergabung ke chat' : ' meninggalkan chat'));
    }
  });

  function send() {
    if (!inputEl) return;
    var val = inputEl.value.trim();
    if (!val) return;
    socket.emit('chat:send', val);
    inputEl.value = '';
    inputEl.focus();
  }

  if (sendBtn) sendBtn.addEventListener('click', send);
  if (inputEl) inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') send();
  });

  function showToast(title, message) {
    if (!toastStack) return;
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<b>' + esc(title) + '</b>' + esc(message);
    toastStack.appendChild(t);
    setTimeout(function () {
      t.style.opacity = '0';
      t.style.transition = 'opacity .4s';
      setTimeout(function () { t.remove(); }, 400);
    }, 6000);
  }

  socket.on('notif:broadcast', function (data) {
    showToast('📢 Notifikasi dari ' + data.from, data.message);
  });

  window.SnapLamToast = showToast;
})();
