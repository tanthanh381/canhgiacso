"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function findPracticeButton() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>(".topbar nav button"))
    .find((button) => button.textContent?.trim() === "Thực hành") ?? null;
}

export function InteractivePracticeNav() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const root = document.getElementById("root") ?? document.body;
    let frame = 0;

    const sync = () => {
      frame = 0;
      setTarget(document.querySelector<HTMLElement>(".ux-bottom-nav"));
      setActive(findPracticeButton()?.getAttribute("aria-current") === "page");
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(sync);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-current"],
    });
    schedule();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  if (!target) return null;

  return createPortal(
    <button
      className={active ? "active ux-practice-nav-item" : "ux-practice-nav-item"}
      aria-current={active ? "page" : undefined}
      aria-label="Thực hành tương tác"
      onClick={() => findPracticeButton()?.click()}
    >
      <span aria-hidden="true">▶</span>
      <small>Thực hành</small>
    </button>,
    target,
  );
}
