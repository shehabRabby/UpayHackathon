import Link from "next/link";
import { Brand, ProductIcon } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <Brand />
      <section className="card not-found-card">
        <div className="not-found-visual" aria-hidden="true"><ProductIcon name="planning" /><span>?</span></div>
        <p className="not-found-code">404</p>
        <h1>Page not found</h1>
        <p className="muted">This page may have moved, or the link took a wrong turn. Let’s get you back on track.</p>
        <div className="actions"><Link className="button" href="/">Back to Home</Link><Link className="button secondary" href="/dashboard">Go to Dashboard</Link></div>
      </section>
    </main>
  );
}
