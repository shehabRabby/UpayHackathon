import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ status: "NEW" }));
vi.mock("@/components/auth-provider", () => ({ useAuth: () => ({ request: vi.fn() }) }));
vi.mock("@/lib/frontend/hooks", () => ({
  useAction: () => ({ busy: false, error: "", success: "", run: vi.fn() }),
  useResource: () => ({ loading: false, error: "", reload: vi.fn(), data: [{ recommendationId: "synthetic", status: state.status, recommendationType: "BUDGET", priority: "HIGH", recommendationText: "Content stays visible." }] }),
}));
import { Recommendations } from "@/components/recommendations";
describe("Rendered recommendation actions", () => {
  it.each([
    ["NEW", ["Mark read", "Complete", "Dismiss"]],
    ["VIEWED", ["Complete", "Dismiss"]],
    ["COMPLETED", []], ["DISMISSED", []],
  ] as const)("renders correct actions for %s and retains its label", (status, buttons) => {
    state.status = status;
    const html = renderToStaticMarkup(createElement(Recommendations));
    expect([...html.matchAll(/<button\b[^>]*>([^<]+)<\/button>/g)].map(match => match[1])).toEqual(buttons);
    expect(html).toContain(`<small class="status-label" data-status="${status}">${status}</small>`);
    expect(html).toContain("Content stays visible.");
  });
});
