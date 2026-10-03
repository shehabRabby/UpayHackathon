import type { Dashboard, Goal } from "@/lib/frontend/types";
import { Metric, money } from "./ui";

export function TransactionOverview({ summary, count, filtered }: { summary: Dashboard; count?: number; filtered: boolean }) {
  return <div className="grid four workspace-metrics"><Metric label="Total income" value={money(summary.totalIncome)} icon="transactions" note="All recorded activity" /><Metric label="Total expenses" value={money(summary.totalExpenses)} icon="analytics" tone="expense" note="All recorded activity" /><Metric label="Net cash flow" value={money(summary.balance)} icon="dashboard" note="Recorded income minus expenses" /><Metric label="Total transactions" value={count ?? "—"} icon="transactions" tone="highlight" note={filtered ? "Matching the current filters" : "All recorded transactions"} /></div>;
}

// Display aggregates of the loaded page only; never presented as whole-account totals.
export function GoalOverview({ goals, page }: { goals: Goal[]; page: number }) {
  const included = goals.filter(goal => goal.status !== "CANCELLED");
  const saved = included.reduce((total, goal) => total + goal.currentAmount, 0);
  const target = included.reduce((total, goal) => total + goal.targetAmount, 0);
  const progress = target > 0 ? Math.round(saved / target * 1000) / 10 : 0;
  return <><p className="summary-scope">Current page {page} · Non-archived goals · Updates with your status filter</p><div className="grid four workspace-metrics"><Metric label="Total saved" value={money(saved)} icon="goals" /><Metric label="Total target" value={money(target)} icon="goals" /><Metric label="Active goals" value={included.filter(goal => goal.status === "ACTIVE").length} icon="goals" tone="highlight" /><Metric label="Overall progress" value={`${progress}%`} icon="analytics" /></div></>;
}
