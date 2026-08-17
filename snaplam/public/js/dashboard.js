(function () {
  var form = document.getElementById('dlForm');
  var urlInput = document.getElementById('dlUrl');
  var resSelect = document.getElementById('dlRes');
  var btn = document.getElementById('dlBtn');
  var btnLabel = document.getElementById('dlBtnLabel');
  var progressWrap = document.getElementById('progressWrap');
  var progressBar = document.getElementById('progressBar');
  var terminal = document.getElementById('terminal');
  var resultBox = document.getElementById('resultBox');
  var historyBody = document.getElementById('historyBody');

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function termLine(message, level) {
    if (!terminal) return;
    var cursor = terminal.querySelector('.term-cursor');
    if (cursor) cursor.remove();

    var div = document.createElement('div');
    div.className = 'term-line ' + (level || 'info');
    var time = new Date().toLocaleTimeString();
    div.innerHTML = '<span class="t">[' + time + ']</span><span class="lvl"></span>' + esc(message);
    terminal.appendChild(div);

    var cur = document.createElement('span');
    cur.className = 'term-cursor';
    terminal.appendChild(cur);

    terminal.scrollTop = terminal.scrollHeight;
  }

  function setProgress(pct, state) {
    if (!progressBar) return;
    progressBar.style.width = pct + '%';
    progressBar.classList.remove('ok', 'fail');
    if (state === 'ok') progressBar.classList.add('ok');
    if (state === 'fail') progressBar.classList.add('fail');
  }

  if (window.SnapLamSocket) {
    window.SnapLamSocket.on('terminal:log', function (data) {
      termLine(data.message, data.level);
      if (data.level === 'info') setProgress(Math.min(85, (parseInt(progressBar.style.width) || 10) + 20));
      if (data.level === 'success') setProgress(100, 'ok');
      if (data.level === 'error') setProgress(100, 'fail');
    });
  }

  function addHistoryRow(row) {
    if (!historyBody) return;
    var emptyRow = historyBody.querySelector('.empty-state');
    if (emptyRow) emptyRow.closest('tr').remove();

    var isSukses = row.status === 'sukses';
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + esc(row.platform || '-') + '</td>' +
      '<td class="mono" style="max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(row.url) + '</td>' +
      '<td>' + esc(row.resolution || '-') + '</td>' +
      '<td><span class="badge ' + (isSukses ? 'sukses' : 'gagal') + '">' + esc(row.status) + '</span></td>' +
      '<td>' + (isSukses && row.result_url ? '<a href="' + esc(row.result_url) + '" target="_blank" style="color:var(--accent2); font-weight:700;">Buka</a>' : '-') + '</td>';
    historyBody.prepend(tr);
  }

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var url = urlInput.value.trim();
      if (!url) return;
      var resolution = resSelect.value;

      btn.disabled = true;
      btn.classList.add('loading');
      if (btnLabel) btnLabel.textContent = 'Memproses...';
      progressWrap.classList.add('show');
      setProgress(8);
      terminal.innerHTML = '';
      resultBox.classList.remove('show');
      resultBox.innerHTML = '';
      termLine('Memulai proses unduhan...', 'info');

      try {
        var res = await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url, resolution: resolution })
        });
        var data = await res.json();

        // Trust the server's explicit status only - a real result_url must
        // also be present for a "sukses" outcome to be shown as such.
        var isSukses = data.status === 'sukses' && !!data.result_url;

        if (isSukses) {
          setProgress(100, 'ok');
          resultBox.classList.add('show');
          resultBox.innerHTML =
            '<a class="result-link" href="' + esc(data.result_url) + '" target="_blank">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
            'Unduh Media (' + esc(data.resolution) + ')</a>';
        } else {
          setProgress(100, 'fail');
          termLine(data.message || 'Gagal memproses unduhan.', 'error');
          resultBox.classList.add('show');
          resultBox.innerHTML =
            '<span class="result-fail">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' +
            esc(data.message || 'Unduhan gagal, coba lagi.') + '</span>';
        }

        addHistoryRow({
          platform: data.platform,
          url: url,
          resolution: data.resolution,
          status: isSukses ? 'sukses' : 'gagal',
          result_url: isSukses ? data.result_url : null
        });
      } catch (err) {
        termLine('Terjadi kesalahan koneksi ke server.', 'error');
        setProgress(100, 'fail');
        resultBox.classList.add('show');
        resultBox.innerHTML = '<span class="result-fail">Koneksi ke server gagal. Coba lagi.</span>';
        addHistoryRow({ platform: '-', url: url, resolution: resolution, status: 'gagal', result_url: null });
      } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        if (btnLabel) btnLabel.textContent = 'Unduh Sekarang';
      }
    });
  }
})();
