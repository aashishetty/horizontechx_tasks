(function () {
  const theme = localStorage.getItem('socialconnectTheme') || 'light';
  document.documentElement.classList.toggle('dark-mode', theme === 'dark');
  document.addEventListener('DOMContentLoaded', function () {
    document.body.classList.toggle('dark-mode', theme === 'dark');
  });
})();
