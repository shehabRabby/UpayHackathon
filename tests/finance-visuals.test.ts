import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CashFlowChart, WellnessSummary } from "@/components/finance-visuals";

describe("Financial presentation uses existing recorded values", () => {
  it("renders income and expense values supplied by the API without substituting demo data", () => {
    const html = renderToStaticMarkup(createElement(CashFlowChart, { trends: [{ month: "2026-10", totalIncome: 72000, totalExpenses: 12500, netCashFlow: 59500, transactionCount: 3 }] }));
    expect(html).toContain("72,000"); expect(html).toContain("12,500"); expect(html).toContain("2026-10");
    expect(html).not.toContain("50,000");
    expect(html).toContain('aria-label="2026-10 income');
  });
  it("shows an empty state rather than invented activity", () => {
    const html = renderToStaticMarkup(createElement(CashFlowChart, { trends: [] }));
    expect(html).toContain("No monthly activity"); expect(html).not.toContain("cash-chart-bars");
  });
  it("renders a saved wellness assessment with its limitations", () => {
    const html = renderToStaticMarkup(createElement(WellnessSummary, { health: { healthId: "fixture", healthScore: 62, savingsScore: 60, spendingScore: 70, goalScore: 40, emergencyScore: 50, assessmentDate: "2026-10-02", limitations: ["Illustrative"] } }));
    expect(html).toContain(">62<"); expect(html).toContain('value="62"'); expect(html).toContain("not a credit score");
  });
});
