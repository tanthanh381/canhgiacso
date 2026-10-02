import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../app/page";
import { UxRefresh } from "../app/ux-refresh";
import { InteractivePracticeNav } from "../app/interactive-practice-nav";
import { PrivilegedMfaGate } from "../app/security-hardening";
import { SessionBootstrap } from "../app/session-bootstrap";
import "../app/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SessionBootstrap>
      <App />
      <UxRefresh />
      <InteractivePracticeNav />
      <PrivilegedMfaGate />
    </SessionBootstrap>
  </StrictMode>,
);
