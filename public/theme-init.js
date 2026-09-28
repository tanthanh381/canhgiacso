(() => {
  try {
    if (window.localStorage.getItem("khien-so-theme") === "dark") {
      document.documentElement.dataset.theme = "dark";
    }
  } catch {
    // Restricted storage mode: keep the default light theme.
  }
})();