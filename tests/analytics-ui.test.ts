import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Health, Spending } from "@/lib/frontend/types";
import { money } from "@/components/ui";

const state = vi.hoisted(() => ({
  charts: [] as Record<string, unknown>[],
  bars: [] as Record<string, unknown>[],
  axes: [] as Record<string, unknown>[],
  resources: {} as Record<string, { data: unknown; loading: boolean; error: string }>,
  resourcePaths: [] as string[],
  request: vi.fn(),
}));

// Capture the chart boundary, so sentinel source values and missing months can
// be checked independently of Recharts' browser measurement and SVG effects.
// Real chart layout, hover and keyboard behavior are checked in Playwright.
vi.mock("recharts", async () => {
  const { createElement } = await import("react");
  type Props = Record<string, unknown> & { children?: ReactNode };
  const container = (props: Props) => createElement("div", null, props.children);
  const chart = (props: Props) => { state.charts.push(props); return container(props); };
  const bar = (props: Props) => { state.bars.push(props); return null; };
  const axis = (props: Props) => { state.axes.push(props); return null; };
  return { ResponsiveContainer: container, BarChart: chart, RadialBarChart: chart,
    Bar: bar, RadialBar: bar, XAxis: axis, YAxis: axis, PolarAngleAxis: axis,
    CartesianGrid: () => null, Tooltip: () => null };
});
vi.mock("@/components/auth-provider", () => ({ useAuth: () => ({ request: state.request }) }));
vi.mock("@/lib/frontend/hooks", () => ({
  useAction: () => ({ busy: false, error: "", success: "", clear: vi.fn(), run: vi.fn() }),
  useResource: (path: string) => {
    state.resourcePaths.push(path);
    return { ...(state.resources[path] ?? { data: null, loading: false, error: "" }), reload: vi.fn() };
  },
}));

import { AnalyticsMeter, AnalyticsWellness, CategoryShares, MonthlyActivityChart, MonthlyTooltip, PeriodChanges } from "@/components/analytics-visuals";
import AnalyticsPage from "@/app/(workspace)/analytics/page";

const health: Health = { healthScore: 62.75, savingsScore: 0, spendingScore: 100,
  goalScore: 33.33, emergencyScore: 12.5, assessmentDate: "2026-10-02" };
const trends: Spending["spendingTrends"] = [
  { month: "2026-01", totalIncome: 1200.12, totalExpenses: 100.34, netCashFlow: 777.77, transactionCount: 2 },
  { month: "2026-03", totalIncome: 0, totalExpenses: 90.56, netCashFlow: -42.19, transactionCount: 1 },
];
const spending: Spending = { period: { startDate: "2026-01-01", endDate: "2026-03-31", days: 90, timeZone: "Asia/Dhaka" },
  totalIncome: 888.88, totalExpenses: 999.99, netCashFlow: -55.55, transactionCount: 3,
  categorySpending: [], spendingTrends: trends,
  comparison: { incomeChangePercent: 245.67, expenseChangePercent: -50.25 }, calculationVersion: "spending-v1" };
const render = (node: ReactNode) => renderToStaticMarkup(node);
const text = (html: string) => html.replace(/<[^>]*>/g, "").replaceAll("&#x27;", "'");

beforeEach(() => {
  state.charts = []; state.bars = []; state.axes = [];
  state.resources = {}; state.resourcePaths = []; state.request.mockClear();
});

describe("Analytics percentages and illustrative scores", () => {
  it.each([0, 12.34, 100])("shows the returned %s share, with its denominator and valid meter", value => {
    const html = render(createElement(CategoryShares, { categories: [{ categoryId: "fixture", categoryName: "Food", totalSpent: 987.65, transactionCount: 2, percentage: value }] }));
    expect(text(html)).toContain(`${value}%`);
    expect(text(html)).toContain("Share of recorded spending");
    expect(text(html)).toContain(money(987.65));
    expect(html).toContain(`value="${value}" max="100"`);
  });
  it.each([-5, 125.25])("keeps out-of-domain %s visible without clamping its meter", value => {
    const html = render(createElement(AnalyticsMeter, { value, label: "Category share", percentage: true }));
    expect(text(html)).toContain(`${value}%`);
    expect(text(html)).toContain("Outside the 0–100 range");
    expect(html).not.toContain("<progress");
  });
  it.each([null, undefined, Number.NaN])("does not invent a zero for a missing or invalid value (%s)", value => {
    const html = render(createElement(AnalyticsMeter, { value, label: "Savings score" }));
    expect(text(html)).toBe("Not provided");
    expect(html).not.toContain("<progress");
  });
  it("keeps every returned category and its unnormalized share", () => {
    const categories = [70.12, 10.01].map((percentage, index) => ({ categoryId: String(index), categoryName: `Category ${index}`, totalSpent: 13.57 + index, transactionCount: 1, percentage }));
    const html = text(render(createElement(CategoryShares, { categories })));
    expect(html).toContain("70.12%"); expect(html).toContain("10.01%");
    expect(html.indexOf("Category 0")).toBeLessThan(html.indexOf("Category 1"));
    expect(html).not.toContain("100%");
  });
  it("shows a category empty state without a fabricated visualization", () => {
    const html = render(createElement(CategoryShares, { categories: [] }));
    expect(text(html)).toContain("No category spending in this period");
    expect(html).not.toContain("<progress");
  });
  it("presents wellness as scores out of 100 and retains component context", () => {
    const html = render(createElement(AnalyticsWellness, { health }));
    expect(html).toContain('aria-valuenow="62.75"');
    expect(text(html)).toContain("62.75out of 100");
    for (const value of [0, 100, 33.33, 12.5]) expect(text(html)).toContain(`${value} / 100`);
    expect(text(html)).toContain("Goal savings proxy");
    expect(text(html)).toContain("liquidity is unknown");
    expect(text(html)).toContain("not a credit score or lending decision");
    expect(text(html)).not.toContain("62.75%");
    expect(state.charts[0].data).toEqual([{ score: 62.75 }]);
    expect(state.axes[0].domain).toEqual([0, 100]);
    expect(state.bars[0].isAnimationActive).toBe(false);
  });
  it.each([0, 100])("renders the exact overall %s boundary", healthScore => {
    const html = render(createElement(AnalyticsWellness, { health: { ...health, healthScore } }));
    expect(html).toContain(`aria-valuenow="${healthScore}"`);
    expect(state.charts[0].data).toEqual([{ score: healthScore }]);
  });
  it("omits a ring when the overall score is absent, without filling it with zero", () => {
    const html = render(createElement(AnalyticsWellness, { health: { ...health, healthScore: undefined as unknown as number } }));
    expect(text(html)).toContain("Not provided");
    expect(state.charts).toEqual([]);
    expect(html).not.toContain('role="meter"');
  });
  it("shows negative and above-100 period changes without a bounded gauge", () => {
    const html = render(createElement(PeriodChanges, { comparison: spending.comparison }));
    expect(text(html)).toContain("+245.67%"); expect(text(html)).toContain("-50.25%");
    expect(text(html)).toContain("previous equal-length period");
    expect(html).not.toContain("<progress"); expect(html).not.toContain('role="meter"');
  });
  it("distinguishes a zero change from an unavailable baseline", () => {
    const html = text(render(createElement(PeriodChanges, { comparison: { incomeChangePercent: 0, expenseChangePercent: null } })));
    expect(html).toContain("Income change0%"); expect(html).toContain("Expenses changeNot comparable");
  });
});

describe("Monthly chart source integrity", () => {
  it("passes original monthly records and series through without filling gaps or computing a net", () => {
    const original = structuredClone(trends);
    const html = render(createElement(MonthlyActivityChart, { trends }));
    expect(state.charts[0].data).toBe(trends); expect(trends).toEqual(original);
    expect(state.bars.map(bar => bar.dataKey)).toEqual(["totalIncome", "totalExpenses"]);
    expect(state.bars.every(bar => bar.isAnimationActive === false)).toBe(true);
    expect(state.charts[0].accessibilityLayer).toBe(true);
    expect(text(html)).toContain("IncomeExpensesBDT");
  });
  it("uses original BDT precision and the returned net in the tooltip", () => {
    const html = text(render(createElement(MonthlyTooltip, { active: true, payload: [{ payload: trends[0] }] })));
    expect(html).toContain("Jan '26");
    for (const value of [1200.12, 100.34, 777.77]) expect(html).toContain(money(value));
    expect(html).not.toContain(money(1099.78));
  });
  it("does not render inactive or missing tooltip data", () => {
    expect(render(createElement(MonthlyTooltip, { active: false, payload: [{ payload: trends[0] }] }))).toBe("");
    expect(render(createElement(MonthlyTooltip, { active: true, payload: [] }))).toBe("");
  });
  it.each(trends)("announces the complete returned $month record in one accessible region", record => {
    const html = render(createElement(MonthlyTooltip, { active: true, accessibilityLayer: true, payload: [{ payload: record }, { payload: record }] }));
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html.match(/aria-live="assertive"/g)).toHaveLength(1);
    expect(html).toContain('aria-atomic="true"');
    expect(text(html)).toContain(record.month === "2026-01" ? "Jan '26" : "Mar '26");
    for (const value of [record.totalIncome, record.totalExpenses, record.netCashFlow]) expect(text(html)).toContain(money(value));
  });
  it.each([false, undefined])("does not create a live region when accessibility is disabled (%s)", accessibilityLayer => {
    const html = render(createElement(MonthlyTooltip, { active: true, accessibilityLayer, payload: [{ payload: trends[0] }] }));
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain("aria-live");
    expect(html).not.toContain("aria-atomic");
    expect(text(html)).toContain(money(trends[0].netCashFlow));
  });
  it("does not announce inactive or missing accessible tooltip data", () => {
    expect(render(createElement(MonthlyTooltip, { active: false, accessibilityLayer: true, payload: [{ payload: trends[0] }] }))).toBe("");
    expect(render(createElement(MonthlyTooltip, { active: true, accessibilityLayer: true, payload: [] }))).toBe("");
  });
  it("shows incomplete tooltip amounts as absent, while keeping an actual zero", () => {
    const html = text(render(createElement(MonthlyTooltip, { active: true, payload: [{ payload: { ...trends[0], totalIncome: undefined as unknown as number, totalExpenses: 0 } }] })));
    expect(html).toContain("IncomeNot provided"); expect(html).toContain(`Expenses${money(0)}`);
  });
  it("does not fabricate monthly activity for an empty series", () => {
    expect(text(render(createElement(MonthlyActivityChart, { trends: [] })))).toContain("No monthly activity");
    expect(state.charts).toEqual([]);
  });
});

describe("Analytics resource states and unchanged data contracts", () => {
  it.each(["loading", "error"])("keeps the spending %s state without stale or invented charts", mode => {
    state.resources["/analytics/spending"] = { data: null, loading: mode === "loading", error: mode === "error" ? "Synthetic API error" : "" };
    const html = render(createElement(AnalyticsPage));
    expect(text(html)).toContain(mode === "loading" ? "Loading" : "Synthetic API error");
    if (mode === "error") expect(text(html)).toContain("Retry");
    expect(text(html)).not.toContain("Monthly trends"); expect(state.charts).toEqual([]);
    expect(state.request).not.toHaveBeenCalled();
  });
  it("retains separate spending, wellness and paginated history resources", () => {
    state.resources["/analytics/spending"] = { data: spending, loading: false, error: "" };
    state.resources["/financial-health"] = { data: health, loading: false, error: "" };
    const html = text(render(createElement(AnalyticsPage)));
    for (const value of [888.88, 999.99, -55.55, 777.77, -42.19]) expect(html).toContain(money(value));
    expect(html).toContain("independently of the spending filter");
    expect(state.resourcePaths).toEqual(["/analytics/spending", "/financial-health", "/financial-health?mode=history&page=1&pageSize=10"]);
    expect(state.request).not.toHaveBeenCalled();
  });
  it("preserves an empty recorded period and history without sample charts", () => {
    state.resources["/analytics/spending"] = { data: { ...spending, transactionCount: 0, spendingTrends: [], categorySpending: [] }, loading: false, error: "" };
    state.resources["/financial-health?mode=history&page=1&pageSize=10"] = { data: [], loading: false, error: "" };
    const html = text(render(createElement(AnalyticsPage)));
    expect(html).toContain("No recorded transactions in this period");
    expect(html).toContain("No category spending"); expect(html).toContain("Save an assessment to start your history");
    expect(state.charts).toEqual([]);
  });
  it.each(["loading", "error"])("preserves wellness %s separately from valid spending", mode => {
    state.resources["/analytics/spending"] = { data: spending, loading: false, error: "" };
    state.resources["/financial-health"] = { data: null, loading: mode === "loading", error: mode === "error" ? "Synthetic wellness error" : "" };
    const html = text(render(createElement(AnalyticsPage)));
    expect(html).toContain("Monthly trends"); expect(html).toContain(mode === "loading" ? "Loading" : "Synthetic wellness error");
    expect(state.charts).toHaveLength(1);
  });
});
