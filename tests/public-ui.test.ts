import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ loading: false, session: null as null | { user: { id: string } }, logout: vi.fn() }));
vi.mock("@/components/auth-provider", () => ({ useAuth: () => auth }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
import { PublicActions, PublicHeader } from "@/components/public-layout";

describe("Public navigation follows the existing auth state", () => {
  beforeEach(() => { auth.loading = false; auth.session = null; auth.logout.mockClear(); });
  it("offers account creation and login only when signed out", () => {
    const header = renderToStaticMarkup(createElement(PublicHeader));
    const actions = renderToStaticMarkup(createElement(PublicActions));
    for (const html of [header, actions]) {
      expect(html).toContain('href="/signup"');
      expect(html).toContain('href="/login"');
      expect(html).not.toContain('href="/dashboard"');
    }
    expect(header).not.toContain("Sign out");
  });
  it("offers the dashboard and existing logout control for a session", () => {
    auth.session = { user: { id: "synthetic-user" } };
    const header = renderToStaticMarkup(createElement(PublicHeader));
    const actions = renderToStaticMarkup(createElement(PublicActions));
    for (const html of [header, actions]) {
      expect(html).toContain('href="/dashboard"');
      expect(html).not.toContain('href="/signup"');
      expect(html).not.toContain('href="/login"');
    }
    expect(header).toContain("Sign out");
    expect(actions).toContain("Go to dashboard");
    expect(auth.logout).not.toHaveBeenCalled();
  });
  it("withholds signed-out and signed-in actions while restoring auth", () => {
    auth.loading = true;
    for (const component of [PublicHeader, PublicActions]) {
      const html = renderToStaticMarkup(createElement(component));
      expect(html).toContain('aria-label="Checking session"');
      for (const path of ["/login", "/signup", "/dashboard"]) expect(html).not.toContain(`href="${path}"`);
    }
  });
  it("retains accessible navigation and presentation-only icons", () => {
    const html = renderToStaticMarkup(createElement(PublicHeader));
    expect(html).toContain('aria-label="Public navigation"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('href="/about"');
    expect(html).toContain('href="/#security"');
    expect(html).toContain('aria-hidden="true"');
  });
});
