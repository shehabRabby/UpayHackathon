import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GoalOverview, TransactionOverview } from "@/components/workspace-overview";
import { HeroVisual } from "@/components/hero-visual";
import type { Goal, Dashboard } from "@/lib/frontend/types";

const goal = { goalId: "fixture", goalName: "Test goal", targetAmount: 40000, currentAmount: 10000, remainingAmount: 30000, targetDate: "2099-01-01", requiredMonthlySaving: 1000, status: "ACTIVE", progressPercentage: 25, isOverdue: false, createdAt: "", updatedAt: "" } satisfies Goal;
describe("Recorded-data presentation", () => {
  it("labels paginated goal summaries and excludes archived goals", () => {
    const html = renderToStaticMarkup(createElement(GoalOverview, { goals: [goal, { ...goal, status: "CANCELLED", currentAmount: 99999 }], page: 2 }));
    expect(html).toContain("Current page 2"); expect(html).toContain("Non-archived goals");
    expect(html).toContain("10,000"); expect(html).toContain("40,000"); expect(html).toContain("25%"); expect(html).not.toContain("99,999");
  });
  it("shows zero progress safely for an empty loaded page", () => {
    const html = renderToStaticMarkup(createElement(GoalOverview, { goals: [], page: 1 }));
    expect(html).toContain("0%"); expect(html).not.toMatch(/NaN|Infinity/);
  });
  it("uses existing backend totals and clearly labels a filtered transaction count", () => {
    const summary = { totalIncome: 72000, totalExpenses: 12500, balance: 59500 } as Dashboard;
    const html = renderToStaticMarkup(createElement(TransactionOverview, { summary, count: 3, filtered: true }));
    expect(html).toContain("72,000"); expect(html).toContain("12,500"); expect(html).toContain("59,500"); expect(html).toContain("Matching the current filters");
  });
  it("shows an original labeled demo instead of a promotional image placeholder", () => {
    const html = renderToStaticMarkup(createElement(HeroVisual));
    expect(html).toContain("Illustrative product preview"); expect(html).toContain("No live wallet connection");
    expect(html).not.toContain("Promotional image to be supplied"); expect(html).toContain("বাংলা");
  });
});
