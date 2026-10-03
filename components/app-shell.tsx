"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "./auth-provider";
import { LoadingIndicator, Notice } from "./ui";
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
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (!auth.loading && !auth.session) router.replace("/login");
  }, [auth.loading, auth.session, router]);
  if (auth.loading)
    return (
      <main className="centered session-restoration card">
        <Brand />
        <LoadingIndicator>Restoring your session and profile…</LoadingIndicator>
      </main>
    );
  if (!auth.session)
    return (
      <main className="centered">
        <LoadingIndicator>Opening sign in…</LoadingIndicator>
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
    <div className="app-shell" data-collapsed={collapsed}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar" onKeyDown={event => { if (event.key === "Escape" && menuOpen) { setMenuOpen(false); menuButton.current?.focus(); } }}>
        <div className="sidebar-header"><Brand href="/" /><button ref={menuButton} type="button" className="navigation-toggle secondary" aria-expanded={menuOpen} aria-controls={menuId} onClick={() => setMenuOpen(value => !value)}><ProductIcon name={menuOpen ? "close" : "menu"} />Menu</button></div>
        <button type="button" className="sidebar-collapse secondary" aria-expanded={!collapsed} aria-controls={menuId} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(value => !value)}><ProductIcon name="arrow" /></button>
        <div id={menuId} className="app-navigation" data-open={menuOpen}>
        <p className="nav-caption">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation">
          {navigation.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              title={label}
              aria-label={label}
              onClick={() => setMenuOpen(false)}
              aria-current={
                path === href || path.startsWith(`${href}/`)
                  ? "page"
                  : undefined
              }
            >
              <ProductIcon name={href.slice(1)} /><span className="nav-label">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" className="public-home-link" title="Public Home" aria-label="Public Home" onClick={() => setMenuOpen(false)}><ProductIcon name="arrow" /><span className="nav-label">Public Home</span></Link>
          <div className="account-identity"><Link href="/profile" className="user-avatar" title={auth.profile?.fullName ?? "Your account"} aria-label="View your profile">{auth.profile?.fullName.slice(0, 1).toUpperCase() ?? "U"}</Link><div><p>{auth.profile?.fullName ?? "Your account"}</p><small>{auth.profile?.email ?? "Private account"}</small></div></div>
          <button className="secondary sidebar-signout" title={loggingOut ? "Signing out…" : "Sign out"} aria-label={loggingOut ? "Signing out…" : "Sign out"} disabled={loggingOut} onClick={logout}>
            <span className="signout-icon"><ProductIcon name="arrow" /></span><span className="nav-label">{loggingOut ? "Signing out…" : "Sign out"}</span>
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
