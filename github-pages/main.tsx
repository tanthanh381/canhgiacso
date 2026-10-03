import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../app/page";
import { AppRoot, initTheme } from "../app/bootstrap";
import "../app/styles/index.css";

initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRoot>
      <App />
    </AppRoot>
  </StrictMode>,
);
