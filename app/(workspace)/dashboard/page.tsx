"use client";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { useResource } from "@/lib/frontend/hooks";
import type { Dashboard, Spending } from "@/lib/frontend/types";
import { Empty, GoalCard, Metric, PageTitle, ResourceState, SpendingBars, date, money } from "@/components/ui";
import { Recommendations } from "@/components/recommendations";
export default function DashboardPage() {
  const { profile } = useAuth();
  const summary = useResource<Dashboard>("/dashboard/summary"), spending = useResource<Spending>("/analytics/spending");
  const data = summary.data;
  return <><PageTitle title={`Hello, ${profile?.fullName.split(" ")[0] ?? "there"}`} description="A clearer view of your recorded finances."><Link href="/transactions" className="button">Add a transaction</Link></PageTitle>
    <ResourceState {...summary} />{data && <>
      <div className="grid four"><Metric label="Recorded cash-flow balance" value={money(data.balance)} note="Recorded income minus expenses; not a wallet balance." /><Metric label="Income this month" value={money(data.monthlyIncome)} /><Metric label="Expenses this month" value={money(data.monthlyExpenses)} /><Metric label="Goal savings" value={money(data.totalSaved)} note={`${data.goalCount} non-cancelled goals`} /></div>
      <div className="grid two section-space"><section className="card"><div className="row"><h2>Your savings goals</h2><Link href="/goals">View all</Link></div>{data.goals.length ? data.goals.map(goal => <GoalCard key={goal.goalId} goal={goal} />) : <Empty>Create your first savings goal to start making progress.</Empty>}</section>
        <section className="card"><div className="row"><h2>Spending by category</h2><Link href="/analytics">Explore</Link></div><ResourceState {...spending} />{spending.data && <><p className="muted">{date(spending.data.period.startDate)} – {date(spending.data.period.endDate)}</p><SpendingBars data={spending.data} /></>}</section></div>
      <section className="card section-space"><div className="row"><h2>Recent transactions</h2><Link href="/transactions">View all</Link></div>{data.recentTransactions.length ? <div className="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Details</th><th>Amount</th></tr></thead><tbody>{data.recentTransactions.map(item => <tr key={item.transactionId}><td>{date(item.transactionDate)}</td><td>{item.categoryName}</td><td>{item.merchantName || item.description || item.transactionType.replaceAll("_", " ")}</td><td>{money(item.amount)}</td></tr>)}</tbody></table></div> : <Empty>No transactions yet. Add your recorded income and expenses.</Empty>}</section>
      <div className="grid two section-space"><section className="card"><h2>Financial insights</h2>{data.latestInsights.length ? data.latestInsights.map(item => <article key={item.insightId}><h3>{item.title}</h3><p>{item.description}</p><small className="muted">{date(item.createdAt)}</small></article>) : <Empty>Refresh spending analytics to save your first insight.</Empty>}</section><Recommendations /></div>
    </>}</>;
}
