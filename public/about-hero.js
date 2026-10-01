(() => {
  const frame = document.querySelector(".about-hero iframe");
  const button = document.querySelector("[data-about-anim-toggle]");
  if (!frame || !button) return;

  const origin = location.origin;
  let playing = false;
  let autoPaused = false;
  const send = (action) => frame.contentWindow?.postMessage({ type: "cgs-about-anim", action }, origin);

  const render = () => {
    button.textContent = playing ? "Tạm dừng" : "Phát";
    button.setAttribute("aria-label", playing ? "Tạm dừng hoạt hình" : "Phát hoạt hình");
  };

  addEventListener("message", (event) => {
    if (event.origin !== origin || event.source !== frame.contentWindow) return;
    if (event.data?.type !== "cgs-about-anim") return;
    playing = Boolean(event.data.playing);
    button.hidden = false;
    render();
  });

  button.addEventListener("click", () => {
    autoPaused = false;
    send("toggle");
  });

  // Stop drawing while scrolled out of view; resume only what this observer paused.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && playing) {
        autoPaused = true;
        send("pause");
      } else if (entry.isIntersecting && autoPaused) {
        autoPaused = false;
        send("play");
      }
    }).observe(frame);
  }

  frame.addEventListener("load", () => send("status"));
  send("status");
})();
