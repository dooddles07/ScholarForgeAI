// Sets the theme before first paint so there is no flash of the wrong one.
// 'system' and a missing preference both follow the device; only an explicit choice overrides it.
(function () {
  try {
    var saved = localStorage.getItem('sf-theme');
    var dark =
      saved === 'dark' ||
      (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
