"use client";
import type { Spending, Health } from "@/lib/frontend/types";
import { Empty, money, date } from "./ui";

// Presentation only: bars scale the API's existing amounts, not new calculations.
export function CashFlowChart({ trends }: { trends: Spending["spendingTrends"] }) {
  const maximum = Math.max(1, ...trends.flatMap(item => [item.totalIncome, item.totalExpenses]));
  if (!trends.length) return <Empty>No monthly activity to display yet.</Empty>;
  return <div className="cash-chart"><div className="chart-legend"><span><i />Income</span><span><i />Expenses</span></div><div className="cash-chart-columns">{trends.map(item => <div className="cash-chart-month" key={item.month}><div className="cash-chart-bars"><div style={{ height: `${item.totalIncome / maximum * 100}%` }} aria-label={`${item.month} income ${money(item.totalIncome)}`} /><div style={{ height: `${item.totalExpenses / maximum * 100}%` }} aria-label={`${item.month} expenses ${money(item.totalExpenses)}`} /></div><strong>{item.month}</strong><small>{money(item.totalIncome)} in</small><small>{money(item.totalExpenses)} out</small></div>)}</div></div>;
}
export function WellnessSummary({ health }: { health: Health }) {
  return <div className="wellness-summary"><div className="wellness-score"><strong>{health.healthScore}</strong><span>/100</span></div><div><h3>Recorded financial wellness</h3><p>Illustrative assessment · {date(health.assessmentDate)}</p></div><progress value={health.healthScore} max={100} aria-label="Overall recorded financial wellness" /><small>Based on recorded data. This is not a credit score.</small></div>;
}
