(function () {
  var adminTerminal = document.getElementById('adminTerminal');
  var notifForm = document.getElementById('notifForm');
  var notifInput = document.getElementById('notifInput');

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function termLine(username, message, level) {
    if (!adminTerminal) return;
    var cursor = adminTerminal.querySelector('.term-cursor');
    if (cursor) cursor.remove();

    var div = document.createElement('div');
    div.className = 'term-line ' + (level || 'info');
    var time = new Date().toLocaleTimeString();
    div.innerHTML =
      '<span class="t">[' + time + ']</span><span class="lvl"></span>' +
      '<b class="mono" style="color:var(--accent2); font-weight:700;">' + esc(username) + '</b> — ' + esc(message);
    adminTerminal.appendChild(div);

    var cur = document.createElement('span');
    cur.className = 'term-cursor';
    adminTerminal.appendChild(cur);

    adminTerminal.scrollTop = adminTerminal.scrollHeight;
  }

  if (window.SnapLamSocket) {
    window.SnapLamSocket.on('admin:log', function (data) {
      termLine(data.username, data.message, data.level);
    });
  }

  if (notifForm) {
    notifForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var msg = notifInput.value.trim();
      if (!msg) return;
      await fetch('/api/admin/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      notifInput.value = '';
      if (window.SnapLamToast) window.SnapLamToast('Terkirim', 'Notifikasi berhasil dibroadcast ke semua user.');
    });
  }
})();
