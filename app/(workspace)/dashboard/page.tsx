"use client";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { useResource } from "@/lib/frontend/hooks";
import type { Dashboard, Spending, Health } from "@/lib/frontend/types";
import { Empty, GoalCard, Metric, PageTitle, ResourceState, SpendingBars, date, money } from "@/components/ui";
import { Recommendations } from "@/components/recommendations";
import { ProductIcon } from "@/components/brand";
import { CashFlowChart, WellnessSummary } from "@/components/finance-visuals";
export default function DashboardPage() {
  const { profile } = useAuth();
  const summary = useResource<Dashboard>("/dashboard/summary"), spending = useResource<Spending>("/analytics/spending"), health = useResource<Health>("/financial-health");
  const data = summary.data;
  return <><PageTitle title={`Hello, ${profile?.fullName.split(" ")[0] ?? "there"}`} description="Here’s your financial overview. Your records, goals and next steps."><Link href="/transactions" className="button"><ProductIcon name="transactions" />Add a transaction</Link></PageTitle>
    <ResourceState {...summary} />{data && <>
      <div className="grid four dashboard-metrics"><Metric label="Recorded cash-flow balance" value={money(data.balance)} icon="dashboard" note="Recorded income minus expenses; not a wallet balance." /><Metric label="Income this month" value={money(data.monthlyIncome)} icon="transactions" tone="success" note="Recorded monthly cash in" /><Metric label="Expenses this month" value={money(data.monthlyExpenses)} icon="analytics" tone="expense" note="Recorded monthly spending" /><Metric label="Goal savings" value={money(data.totalSaved)} icon="goals" tone="highlight" note={`${data.goalCount} non-cancelled goals`} /></div>
      <div className="dashboard-layout section-space"><div className="dashboard-primary">
        <section className="card"><div className="row"><div><p className="eyebrow">YOUR RECORDED ACTIVITY</p><h2>Cash flow overview</h2></div><Link href="/analytics">View analytics</Link></div><div className="cash-overview"><div><small>Monthly net cash flow</small><strong className={data.monthlyNetCashFlow < 0 ? "amount-expense" : "amount-income"}>{money(data.monthlyNetCashFlow)}</strong></div><span className="badge">Recorded data</span></div><ResourceState {...spending} />{spending.data && <CashFlowChart trends={spending.data.spendingTrends} />}</section>
        <section className="card"><div className="row"><h2>Spending by category</h2><Link href="/analytics">Explore</Link></div>{spending.data && <><p className="muted">{date(spending.data.period.startDate)} – {date(spending.data.period.endDate)}</p><SpendingBars data={spending.data} /></>}</section>
        <section className="card"><div className="row"><h2>Recent transactions</h2><Link href="/transactions">View all</Link></div>{data.recentTransactions.length ? <div className="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Details</th><th>Amount</th></tr></thead><tbody>{data.recentTransactions.map(item => <tr key={item.transactionId}><td>{date(item.transactionDate)}</td><td>{item.categoryName}</td><td>{item.merchantName || item.description || item.transactionType.replaceAll("_", " ")}</td><td className={item.transactionType === "CASH_IN" ? "amount-income" : "amount-expense"}>{money(item.amount)}</td></tr>)}</tbody></table></div> : <Empty>No transactions yet. Add your recorded income and expenses.</Empty>}</section>
        <section className="card"><h2>Financial insights</h2>{data.latestInsights.length ? data.latestInsights.map(item => <article key={item.insightId}><h3>{item.title}</h3><p>{item.description}</p><small className="muted">{date(item.createdAt)}</small></article>) : <Empty>Refresh spending analytics to save your first insight.</Empty>}</section>
      </div><div className="dashboard-secondary">
        <section className="card"><div className="row"><h2>Financial wellness</h2><Link href="/analytics">Details</Link></div><ResourceState {...health} />{health.data && <WellnessSummary health={health.data} />}{!health.loading && !health.error && !health.data && <Empty>Save an assessment in Analytics to see your wellness.</Empty>}</section>
        <section className="card"><div className="row"><h2>Your savings goals</h2><Link href="/goals">View all</Link></div>{data.goals.length ? data.goals.map(goal => <GoalCard key={goal.goalId} goal={goal} />) : <Empty>Create your first savings goal to start making progress.</Empty>}</section>
        <section className="card quick-actions"><p className="eyebrow">MAKE YOUR NEXT MOVE</p><h2>Quick actions</h2>{[["/transactions","transactions","Add transaction"],["/goals","goals","New savings goal"],["/coach","coach","Ask AI Coach"],["/planning","planning","Plan a purchase"]].map(([href,icon,label]) => <Link href={href} key={href}><ProductIcon name={icon} /><span>{label}</span><ProductIcon name="arrow" /></Link>)}</section>
        <Recommendations />
      </div></div>
    </>}</>;
}
