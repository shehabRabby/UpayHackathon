"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "./auth-provider";
import { Notice } from "./ui";

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
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">u</span>
          <span>
            Upay
            <br />
            <small>Financial Coach</small>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          {navigation.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                path === href || path.startsWith(`${href}/`)
                  ? "page"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>{auth.profile?.fullName ?? "Your account"}</p>
          <button className="secondary" disabled={loggingOut} onClick={logout}>
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
          <Notice error={logoutError} />
        </div>
      </aside>
      <div className="workspace">
        <div className="prototype-banner">
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
