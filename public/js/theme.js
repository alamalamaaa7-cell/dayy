(function () {
  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-dot').forEach(function (el) {
      el.classList.toggle('active', el.dataset.theme === theme);
    });
  }

  window.SnapLamTheme = {
    init: function (initial) {
      applyTheme(initial || 'abu');
      document.querySelectorAll('.theme-dot').forEach(function (el) {
        el.addEventListener('click', function () {
          var theme = el.dataset.theme;
          applyTheme(theme);
          fetch('/theme', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme: theme })
          }).catch(function () {});
        });
      });
    }
  };
})();
