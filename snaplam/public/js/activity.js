(function () {
  var terminal = document.getElementById('globalTerminal');
  var countEl = document.getElementById('activityCount');
  if (!terminal) return;

  var count = 0;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function shortUrl(url) {
    if (!url) return '';
    return url.length > 48 ? url.slice(0, 48) + '…' : url;
  }

  function line(data) {
    var cursor = terminal.querySelector('.term-cursor');
    if (cursor) cursor.remove();

    var div = document.createElement('div');
    div.className = 'term-line ' + (data.level || 'info');
    var time = new Date(data.time || Date.now()).toLocaleTimeString();

    div.innerHTML =
      '<span class="t">[' + time + ']</span>' +
      '<span class="lvl"></span>' +
      '<b class="mono act-user">' + esc(data.username || '?') + '</b>' +
      (data.platform ? '<span class="ptag">' + esc(data.platform) + '</span>' : '') +
      (data.resolution ? '<span class="rtag">' + esc(data.resolution) + '</span>' : '') +
      '<span class="act-msg">' + esc(data.message) + '</span>' +
      (data.url ? '<span class="urltag mono">' + esc(shortUrl(data.url)) + '</span>' : '');

    terminal.appendChild(div);

    var cur = document.createElement('span');
    cur.className = 'term-cursor';
    terminal.appendChild(cur);

    terminal.scrollTop = terminal.scrollHeight;

    count++;
    if (countEl) countEl.textContent = count;
  }

  if (window.SnapLamSocket) {
    window.SnapLamSocket.on('activity:log', line);
  }
})();
