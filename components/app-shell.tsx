"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "./auth-provider";
import { Notice } from "./ui";
import { Brand, ProductIcon } from "./brand";

const navigation = [
  ["/dashboard", "Dashboard"],
  ["/transactions", "Transactions"],
  ["/goals", "Savings goals"],
  ["/analytics", "Analytics"],
  ["/coach", "AI Coach"],
  ["/planning", "Plan & affordability"],
  ["/profile", "Profile"],
];
export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth(),
    path = usePathname(),
    router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false),
    [logoutError, setLogoutError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false), menuId = useId(), menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!auth.loading && !auth.session) router.replace("/login");
  }, [auth.loading, auth.session, router]);
  if (auth.loading)
    return (
      <main className="centered">
        <div className="brand">Upay Financial Coach</div>
        <p role="status">Restoring your session and profile…</p>
      </main>
    );
  if (!auth.session)
    return (
      <main className="centered">
        <p role="status">Opening sign in…</p>
        <Link href="/login">Sign in</Link>
      </main>
    );
  const logout = async () => {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await auth.logout();
      router.replace("/login");
    } catch {
      setLogoutError("Sign out failed. Please retry.");
    } finally {
      setLoggingOut(false);
    }
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar" onKeyDown={event => { if (event.key === "Escape" && menuOpen) { setMenuOpen(false); menuButton.current?.focus(); } }}>
        <div className="sidebar-header"><Brand href="/" /><button ref={menuButton} type="button" className="navigation-toggle secondary" aria-expanded={menuOpen} aria-controls={menuId} onClick={() => setMenuOpen(value => !value)}><ProductIcon name={menuOpen ? "close" : "menu"} />Menu</button></div>
        <div id={menuId} className="app-navigation" data-open={menuOpen}>
        <p className="nav-caption">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation">
          {navigation.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              aria-current={
                path === href || path.startsWith(`${href}/`)
                  ? "page"
                  : undefined
              }
            >
              <ProductIcon name={href.slice(1)} />{label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" className="public-home-link" onClick={() => setMenuOpen(false)}><ProductIcon name="arrow" />Public Home</Link>
          <div className="account-identity"><span className="user-avatar" aria-hidden="true">{auth.profile?.fullName.slice(0, 1).toUpperCase() ?? "U"}</span><div><p>{auth.profile?.fullName ?? "Your account"}</p><small>{auth.profile?.email ?? "Private account"}</small></div></div>
          <button className="secondary" disabled={loggingOut} onClick={logout}>
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
          <Notice error={logoutError} />
        </div>
        </div>
      </aside>
      <div className="workspace">
        <div className="prototype-banner">
          <ProductIcon name="shield" />
          Prototype · Your recorded finances. No live Upay wallet connection.
        </div>
        <main id="main-content">
          {auth.error || !auth.profile ? (
            <section className="card">
              <h1>Let’s finish loading your profile</h1>
              <Notice error={auth.error} />
              <button onClick={auth.retry}>Retry profile sync</button>
            </section>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
