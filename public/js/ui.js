(function () {
  var menuToggle = document.getElementById('menuToggle');
  var sidebarClose = document.getElementById('sidebarClose');
  var overlay = document.getElementById('sidebarOverlay');

  function openSidebar() {
    document.body.classList.add('sidebar-open');
  }
  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
  }
  function toggleSidebar() {
    document.body.classList.toggle('sidebar-open');
  }

  if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
  if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  // Close the drawer automatically after navigating via a sidebar link
  document.querySelectorAll('.sidebar-nav a').forEach(function (a) {
    a.addEventListener('click', closeSidebar);
  });

  // Chat Publik modal - opened from its named sidebar menu item
  var openChatBtn = document.getElementById('openChatBtn');
  var chatModalClose = document.getElementById('chatModalClose');
  var chatModalOverlay = document.getElementById('chatModalOverlay');
  var chatInput = document.getElementById('chatInput');

  function openChat() {
    closeSidebar();
    document.body.classList.add('chat-open');
    if (openChatBtn) openChatBtn.classList.remove('has-unread');
    if (chatInput) setTimeout(function () { chatInput.focus(); }, 260);
  }
  function closeChat() {
    document.body.classList.remove('chat-open');
  }

  if (openChatBtn) openChatBtn.addEventListener('click', openChat);
  if (chatModalClose) chatModalClose.addEventListener('click', closeChat);
  if (chatModalOverlay) chatModalOverlay.addEventListener('click', closeChat);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeSidebar();
    closeChat();
  });
})();
