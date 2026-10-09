"use client";

import {
  Bar, BarChart, CartesianGrid, PolarAngleAxis, RadialBar,
  RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Health, Spending } from "@/lib/frontend/types";
import { Empty, date, money } from "./ui";

type MonthlyRecord = Spending["spendingTrends"][number];
type MaybeNumber = number | null | undefined;
const finite = (value: MaybeNumber): value is number => typeof value === "number" && Number.isFinite(value);
const bounded = (value: MaybeNumber): value is number => finite(value) && value >= 0 && value <= 100;
const amount = (value: MaybeNumber) => finite(value) ? money(value) : "Not provided";
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (month: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
  ? `${months[Number(month.slice(5)) - 1]} '${month.slice(2, 4)}` : month;

// These components only present returned values. They do not compute financial
// ratios, normalize category shares, fill missing months, or clamp API scores.
export function AnalyticsMeter({ value, label, percentage = false }: {
  value: MaybeNumber; label: string; percentage?: boolean;
}) {
  return <div className="analytics-meter">
    <strong className="analytics-meter-value">{finite(value) ? <>{value}{percentage ? <span>%</span> : <span> / 100</span>}</> : "Not provided"}</strong>
    {bounded(value) && <progress value={value} max={100} aria-label={label} />}
    {finite(value) && !bounded(value) && <small className="muted">Outside the 0–100 range</small>}
  </div>;
}

export function CategoryShares({ categories }: { categories: Spending["categorySpending"] }) {
  if (!categories.length) return <Empty>No category spending in this period. Recorded expenses will appear here.</Empty>;
  return <ul className="analytics-categories" aria-label="Recorded spending by category">{categories.map(item =>
    <li key={item.categoryId}>
      <div className="analytics-category-heading"><h3>{item.categoryName}</h3><strong>{amount(item.totalSpent)}</strong></div>
      <div className="analytics-category-share"><span className="muted">Share of recorded spending</span><AnalyticsMeter value={item.percentage} label={`${item.categoryName}: share of recorded spending`} percentage /></div>
      <small className="muted">{item.transactionCount} recorded transactions</small>
    </li>,
  )}</ul>;
}

export function PeriodChanges({ comparison }: { comparison: Spending["comparison"] }) {
  return <div className="analytics-comparisons" aria-label="Changes from the previous equal-length period">
    {([ ["Income", comparison.incomeChangePercent], ["Expenses", comparison.expenseChangePercent] ] as const).map(([label, value]) =>
      <div className="analytics-change" key={label}><span>{label} change</span>
        <strong>{finite(value) ? `${value > 0 ? "+" : ""}${value}%` : "Not comparable"}</strong>
        <small className="muted">{finite(value) ? "vs. previous equal-length period" : "Previous-period baseline unavailable"}</small>
      </div>,
    )}
  </div>;
}

export function MonthlyTooltip({ active, payload, accessibilityLayer = false }: {
  active?: boolean; payload?: readonly { payload?: MonthlyRecord }[]; accessibilityLayer?: boolean;
}) {
  const record = payload?.[0]?.payload;
  if (!active || !record) return null;
  // Recharts supplies this flag to custom content. Use one live region, as its
  // default tooltip does, without announcing separately for each amount.
  return <div className="analytics-tooltip" role={accessibilityLayer ? "status" : undefined} aria-live={accessibilityLayer ? "assertive" : undefined} aria-atomic={accessibilityLayer ? true : undefined}><strong>{monthLabel(record.month)}</strong>
    <dl><div><dt>Income</dt><dd>{amount(record.totalIncome)}</dd></div>
      <div><dt>Expenses</dt><dd>{amount(record.totalExpenses)}</dd></div>
      <div><dt>Net cash flow</dt><dd>{amount(record.netCashFlow)}</dd></div></dl>
  </div>;
}

export function MonthlyActivityChart({ trends }: { trends: Spending["spendingTrends"] }) {
  if (!trends.length) return <Empty>No monthly activity to display yet.</Empty>;
  return <figure className="analytics-monthly-chart" aria-label="Recorded monthly income and expenses in BDT">
    <div className="analytics-chart-key"><span><i className="income" />Income</span><span><i className="expenses" />Expenses</span><small>BDT</small></div>
    <div className="analytics-chart-canvas">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 300, height: 280 }}>
        <BarChart data={trends} margin={{ top: 16, right: 8, bottom: 8, left: 0 }} barGap={4} accessibilityLayer aria-label="Monthly income and expenses; use arrow keys to explore">
          <CartesianGrid vertical={false} stroke="#e4ebf3" strokeDasharray="3 5" />
          <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={false} minTickGap={18} tick={{ fill: "#4b5d73", fontSize: 11 }} />
          <YAxis width={46} tickLine={false} axisLine={false} tick={{ fill: "#4b5d73", fontSize: 11 }} tickFormatter={value => new Intl.NumberFormat("en-BD", { notation: "compact", maximumFractionDigits: 1 }).format(value)} />
          <Tooltip content={<MonthlyTooltip />} cursor={{ fill: "#edf4ff" }} isAnimationActive={false} offset={8} />
          <Bar dataKey="totalIncome" name="Income" fill="#0054A6" radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
          <Bar dataKey="totalExpenses" name="Expenses" fill="#FFD602" stroke="#927b00" strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <figcaption className="muted">Monthly recorded amounts. Use the chart or the table below to explore exact values.</figcaption>
  </figure>;
}

const components = [
  ["Savings", "savingsScore", "Recorded saving rate against the 20% reference."],
  ["Spending", "spendingScore", "Recorded expenses relative to recorded income."],
  ["Goals", "goalScore", "Average progress of non-cancelled savings goals."],
  ["Emergency", "emergencyScore", "Goal savings proxy against a 3-month expense reference; liquidity is unknown."],
] as const;

export function AnalyticsWellness({ health }: { health: Health }) {
  const value = health.healthScore;
  return <div className="analytics-wellness">
    <div className="analytics-wellness-overall">
      <div className="analytics-score-ring" role={bounded(value) ? "meter" : undefined} aria-label="Overall recorded financial wellness" aria-valuemin={bounded(value) ? 0 : undefined} aria-valuemax={bounded(value) ? 100 : undefined} aria-valuenow={bounded(value) ? value : undefined} aria-valuetext={bounded(value) ? `${value} out of 100` : undefined}>
        {bounded(value) && <div aria-hidden="true"><RadialBarChart width={168} height={168} innerRadius={68} outerRadius={82} startAngle={90} endAngle={-270} data={[{ score: value }]} accessibilityLayer={false}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="score" fill="#0054A6" background={{ fill: "#e5edf7" }} cornerRadius={8} isAnimationActive={false} />
        </RadialBarChart></div>}
        <div className="analytics-ring-label"><strong>{finite(value) ? value : "Not provided"}</strong>{finite(value) && <span>out of 100</span>}</div>
      </div>
      <h3>Recorded financial wellness</h3>
      <p className="muted">Illustrative score · {date(health.assessmentDate)}</p>
      {finite(value) && !bounded(value) && <small className="muted">Outside the 0–100 range</small>}
      <p className="analytics-score-note">Based on recorded data. This is not a credit score or lending decision.</p>
    </div>
    <div className="analytics-score-components">{components.map(([label, key, context]) =>
      <div className="analytics-component" key={key}><h3>{label} score</h3><AnalyticsMeter value={health[key]} label={`${label} score out of 100`} /><p className="muted">{context}</p></div>,
    )}</div>
  </div>;
}
