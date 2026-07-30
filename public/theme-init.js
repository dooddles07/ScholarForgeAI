// Sets the theme before first paint so there is no flash of the wrong one.
// Default is dark; a saved preference of 'light' is the only way to opt out.
(function () {
  try {
    var saved = localStorage.getItem('sf-theme');
    var dark = saved !== 'light';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
