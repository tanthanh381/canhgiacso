(() => {
  const root = document.documentElement;
  const button = document.querySelector("[data-app-theme-toggle]");
  if (!button) return;
  const sync = () => { button.textContent = root.dataset.theme === "dark" ? "☀" : "☾"; };
  button.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    if (next === "dark") root.dataset.theme = "dark"; else delete root.dataset.theme;
    try { window.localStorage.setItem("khien-so-theme", next); } catch { /* storage unavailable */ }
    sync();
  });
  sync();
})();
