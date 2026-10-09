import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ loading: false, session: null as null | { user: { id: string } }, logout: vi.fn() }));
vi.mock("@/components/auth-provider", () => ({ useAuth: () => auth }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
import { PublicActions, PublicHeader, PublicFooter } from "@/components/public-layout";
import Security from "@/app/security/page";

describe("Public navigation follows the existing auth state", () => {
  it("discloses optional provider data use, synthetic tests and incomplete deletion/retention", () => {
    const html = renderToStaticMarkup(createElement(Security));
    expect(html).toContain("configured Gemini provider");
    expect(html).toContain("Calculation-only features do not need Gemini");
    expect(html).toContain("synthetic/mock fixtures, not customer records");
    expect(html).toContain("No automatic retention period is implemented");
    expect(html).toContain("its recommendations remain");
    expect(html).toContain("Account-wide data deletion is not currently implemented");
    expect(html).toContain("AI can make mistakes");
  });
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
    expect(html).toContain('href="/security"');
    expect(html).toContain('aria-hidden="true"');
  });
  it("uses standalone routes in the navbar and footer rather than home anchors", () => {
    for (const component of [PublicHeader, PublicFooter]) {
      const html = renderToStaticMarkup(createElement(component));
      for (const path of ["/about", "/features", "/how-it-works", "/security"]) expect(html).toContain(`href="${path}"`);
      expect(html).not.toContain('href="/#');
    }
  });
  it("keeps feature exploration available beside the authenticated hero action", () => {
    auth.session = { user: { id: "synthetic-user" } };
    const html = renderToStaticMarkup(createElement(PublicActions, { explore: true }));
    expect(html).toContain('href="/features"');
    expect(html).toContain('href="/dashboard"');
    expect(html).not.toContain('href="/signup"');
  });
  it("offers feature exploration beside signup on the logged-out hero", () => {
    const html = renderToStaticMarkup(createElement(PublicActions, { explore: true }));
    expect(html).toContain('href="/features"'); expect(html).toContain('href="/signup"'); expect(html).not.toContain('href="/login"');
  });
});
