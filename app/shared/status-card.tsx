import type { ReactNode } from "react";

/** Full-page message shown instead of the app while it cannot be displayed (verifying the session, a rendering error). */
export function StatusCard({ title, children, alert = false }: { title: string; children: ReactNode; alert?: boolean }) {
  return (
    <main className="session-bootstrap" {...(alert ? { role: "alert" } : { "aria-live": "polite" as const })}>
      <section className="session-bootstrap-card">
        <div className="session-bootstrap-mark" aria-hidden="true">◉</div>
        <h1>{title}</h1>
        {children}
      </section>
    </main>
  );
}
