"use client";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useAction, useResource } from "@/lib/frontend/hooks";
import { queryPath } from "@/lib/frontend/api-client";
import type { Health, Spending } from "@/lib/frontend/types";
import { AnalyticsWellness, CategoryShares, MonthlyActivityChart, PeriodChanges } from "@/components/analytics-visuals";
import { Empty, Field, Limitations, Metric, Notice, PageTitle, Pagination, ResourceState, currentDate, date, money } from "@/components/ui";

export default function AnalyticsPage() {
  const { request } = useAuth(), action = useAction();
  const [filters, setFilters] = useState<Record<string, string>>({}), [historyPage, setHistoryPage] = useState(1);
  const spending = useResource<Spending>(queryPath("/analytics/spending", filters)), health = useResource<Health>("/financial-health");
  const history = useResource<Health[]>(`/financial-health?mode=history&page=${historyPage}&pageSize=10`);
  const data = spending.data;
  return <div className="analytics-dashboard">
    <PageTitle title="Analytics" description="Understand your recorded spending and illustrative financial wellness." />
    <section className="card analytics-controls">
      <p className="eyebrow">EXPLORE YOUR RECORDED ACTIVITY</p>
      <form onChange={action.clear} onInvalidCapture={action.clear} className="filters" onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        setFilters(Object.fromEntries([...fields.entries()].filter(([, value]) => String(value)).map(([key, value]) => [key, String(value)])));
      }}>
        <Field label="Start date"><input name="startDate" type="date" max={currentDate()} /></Field>
        <Field label="End date"><input name="endDate" type="date" max={currentDate()} /></Field>
        <button className="secondary" type="submit">Apply period</button>
        <button type="button" disabled={action.busy || spending.loading || Boolean(spending.error)} onClick={() => action.run(async () => {
          await request("/analytics/refresh", { method: "POST", body: filters }); spending.reload();
        }, "Spending insight saved to your dashboard.")}>Refresh & save insight</button>
      </form>
      <p className="muted">Default: past 90 days. Custom ranges may contain up to 366 days.</p>
      <Notice error={action.error} success={action.success} /><ResourceState {...spending} />
    </section>
    {data && <>
      <p className="muted section-space analytics-period">{date(data.period.startDate)} – {date(data.period.endDate)} · Asia/Dhaka · {data.transactionCount} transactions</p>
      <div className="grid three">
        <Metric label="Recorded income" value={money(data.totalIncome)} icon="transactions" />
        <Metric label="Recorded expenses" value={money(data.totalExpenses)} icon="analytics" tone="expense" />
        <Metric label="Net cash flow" value={money(data.netCashFlow)} />
      </div>
      <div className="grid two section-space analytics-breakdown">
        <section className="card">
          <p className="eyebrow">WHERE YOUR MONEY GOES</p><h2>Category spending</h2>
          <p className="muted analytics-card-description">Each category’s share of expenses recorded in this period.</p>
          <CategoryShares categories={data.categorySpending} />
        </section>
        <section className="card">
          <p className="eyebrow">ACTIVITY OVER TIME</p><h2>Monthly trends</h2>
          {data.transactionCount > 0 && <MonthlyActivityChart trends={data.spendingTrends} />}
          {data.transactionCount === 0 && <Empty>No recorded transactions in this period.</Empty>}
          <div className="table-wrap"><table className="analytics-data-table" role="table"><caption className="sr-only">Exact monthly recorded amounts in BDT</caption><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th></tr></thead>
            <tbody>{data.spendingTrends.map(item => <tr key={item.month}><td data-label="Month">{item.month}</td><td data-label="Income">{money(item.totalIncome)}</td><td data-label="Expenses">{money(item.totalExpenses)}</td><td data-label="Net">{money(item.netCashFlow)}</td></tr>)}</tbody>
          </table></div>
          <PeriodChanges comparison={data.comparison} />
        </section>
      </div>
    </>}
    <section className="card section-space">
      <div className="row"><div><p className="eyebrow">YOUR RECORDED FINANCIAL PICTURE</p><h2>Illustrative financial wellness</h2></div>
        <button className="secondary" disabled={action.busy} onClick={() => action.run(async () => {
          await request("/financial-health/refresh", { method: "POST", body: { lookbackMonths: 3, store: true } }); health.reload(); history.reload();
        }, "Wellness assessment saved.")}>Save assessment</button>
      </div>
      <p className="muted analytics-card-description">Scores out of 100. Uses the past 90 days and current goal balances, independently of the spending filter.</p>
      <ResourceState {...health} />
      {health.data && <><AnalyticsWellness health={health.data} /><Limitations items={health.data.limitations} /></>}
    </section>
    <section className="card section-space">
      <h2>Wellness history</h2><ResourceState {...history} />
      {history.data?.length === 0 && <Empty>Save an assessment to start your history.</Empty>}
      {history.data && history.data.length > 0 && <div className="table-wrap"><table className="analytics-data-table" role="table"><caption className="sr-only">Saved illustrative scores out of 100</caption><thead><tr><th>Date</th><th>Overall</th><th>Savings</th><th>Spending</th><th>Goals</th><th>Emergency</th></tr></thead>
        <tbody>{history.data.map((item, index) => <tr key={item.healthId ?? index}><td data-label="Date">{date(item.assessmentDate)}</td><td data-label="Overall">{item.healthScore}</td><td data-label="Savings">{item.savingsScore}</td><td data-label="Spending">{item.spendingScore}</td><td data-label="Goals">{item.goalScore}</td><td data-label="Emergency">{item.emergencyScore}</td></tr>)}</tbody>
      </table></div>}
      <Pagination page={historyPage} meta={history.meta} change={setHistoryPage} />
      <small className="muted">Scores are illustrative, not credit scores. Historical records store scores, not their original calculation inputs.</small>
    </section>
  </div>;
}
