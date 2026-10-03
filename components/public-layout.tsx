"use client";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";
import { Brand, ProductIcon } from "./brand";
const links = [["/", "Home"], ["/about", "About"], ["/features", "Features"], ["/how-it-works", "How it works"], ["/security", "Security"]];
export function PublicActions({ dashboardLabel = "Go to dashboard", signupLabel = "Get started", explore = false }: { dashboardLabel?: string; signupLabel?: string; explore?: boolean }) {
  const { loading, session } = useAuth();
  if (loading) return <div className="auth-placeholder" role="status" aria-label="Checking session"><span /><span /></div>;
  return <div className="actions">{session ? <><Link className="button brand-cta" href="/dashboard">{dashboardLabel}<ProductIcon name="arrow" /></Link>{explore && <Link className="button secondary" href="/features">Explore features</Link>}</> : <><Link className="button brand-cta" href="/signup">{signupLabel}<ProductIcon name="arrow" /></Link><Link className="button secondary" href={explore ? "/features" : "/login"}>{explore ? "Explore features" : "Sign in"}</Link></>}</div>;
}
export function PublicHeader() {
  const auth = useAuth(), path = usePathname(), id = useId(), toggle = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function logout() { setBusy(true); setError(""); try { await auth.logout(); setOpen(false); } catch { setError("Sign out failed. Please retry."); } finally { setBusy(false); } }
  return <header className="public-header"><a className="skip-link" href="#main-content">Skip to content</a><div className="public-nav container" onKeyDown={event => { if (event.key === "Escape" && open) { setOpen(false); toggle.current?.focus(); } }}><Brand /><button ref={toggle} type="button" className="navigation-toggle secondary" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}><ProductIcon name={open ? "close" : "menu"} />Menu</button><div id={id} className="public-nav-panel" data-open={open}><nav aria-label="Public navigation">{links.map(([href, label]) => <Link key={href} href={href} aria-current={href === path ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}</nav><div className="public-account">{auth.loading ? <div className="auth-placeholder" role="status" aria-label="Checking session"><span /><span /></div> : auth.session ? <><Link href="/dashboard" className="button">Dashboard</Link><button type="button" className="secondary" disabled={busy} onClick={logout}>{busy ? "Signing out…" : "Sign out"}</button></> : <><Link href="/login" className="nav-signin">Sign in</Link><Link href="/signup" className="button">Get started</Link></>}</div></div></div>{error && <p className="notice error container" role="alert">{error}</p>}</header>;
}
export function PublicFooter() {
  return <footer className="public-footer"><div className="container footer-grid"><div><Brand /><p>Financial clarity for everyday decisions.</p><small>Prototype project. Uses recorded financial data and does not connect to a live Upay wallet. No official Upay endorsement is implied.</small></div><nav aria-label="Footer navigation"><h2>Explore</h2>{links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav><nav aria-label="Product navigation"><h2>Product</h2>{[["/dashboard", "Dashboard"], ["/goals", "Savings goals"], ["/coach", "AI Coach"], ["/planning", "Planning"]].map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav></div><div className="container footer-note">Built around your records. Designed for more informed decisions.</div></footer>;
}
