"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { useAction, useResource } from "@/lib/frontend/hooks";
import { numeric } from "@/lib/frontend/forms";
import type { Goal, Contribution, SavingsPlan } from "@/lib/frontend/types";
import { AmountInput, Empty, Field, Limitations, Metric, Notice, PageTitle, Pagination, ResourceState, date, money } from "@/components/ui";
export default function GoalDetail() {
  const { id } = useParams<{ id: string }>(), { request } = useAuth(), action = useAction();
  const [page, setPage] = useState(1), [plan, setPlan] = useState<SavingsPlan | null>(null), [version, setVersion] = useState(0);
  const resource = useResource<Goal>(`/goals/${id}`), history = useResource<Contribution[]>(`/goals/${id}/contributions?page=${page}&pageSize=20`);
  const goal = resource.data, mutable = goal?.status === "ACTIVE" || goal?.status === "PAUSED";
  const clearAction = action.clear;
  useEffect(() => { clearAction(); setPlan(null); setPage(1); }, [id, clearAction]);
  function refresh() { resource.reload(); history.reload(); setPlan(null); setVersion(value => value + 1); }
  function contribute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const fields = new FormData(event.currentTarget);
    void action.run(async () => { await request(`/goals/${id}/contributions`, { method: "POST", body: { amount: numeric(fields, "amount"), ...(String(fields.get("transactionId") ?? "").trim() ? { transactionId: String(fields.get("transactionId")).trim() } : {}) } }); refresh(); }, "Contribution added.");
  }
  function edit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const fields = new FormData(event.currentTarget), targetDate = String(fields.get("targetDate"));
    void action.run(async () => { await request(`/goals/${id}`, { method: "PATCH", body: { goalName: String(fields.get("goalName")).trim(), targetAmount: numeric(fields, "targetAmount"), ...(targetDate !== goal?.targetDate ? { targetDate } : {}) } }); refresh(); }, "Goal updated.");
  }
  return <><PageTitle title={goal?.goalName ?? "Goal details"} description="Your progress, contributions, and personalized savings plan."><Link href="/goals">← All goals</Link></PageTitle><ResourceState {...resource} /><Notice error={action.error} success={action.success} />
    {goal && <><div className="grid four"><Metric label="Saved" value={money(goal.currentAmount)} /><Metric label="Target" value={money(goal.targetAmount)} /><Metric label="Remaining" value={money(goal.remainingAmount)} /><Metric label="Required monthly saving" value={money(goal.requiredMonthlySaving)} note={`Target ${date(goal.targetDate)}${goal.isOverdue ? " · Overdue" : ""}`} /></div>
      <section className="card section-space"><div className="row"><h2>{goal.progressPercentage}% saved</h2><span className="badge">{goal.status}</span></div><progress value={goal.progressPercentage} max={100} aria-label="Savings progress" />
        <div className="actions">{mutable && <button className="secondary" disabled={action.busy} onClick={() => action.run(async () => { await request(`/goals/${id}`, { method: "PATCH", body: { status: goal.status === "PAUSED" ? "ACTIVE" : "PAUSED" } }); refresh(); }, goal.status === "PAUSED" ? "Goal resumed." : "Goal paused.")}>{goal.status === "PAUSED" ? "Resume goal" : "Pause goal"}</button>}
          {goal.status !== "COMPLETED" && goal.status !== "CANCELLED" && <button className="danger" disabled={action.busy} onClick={() => { if (window.confirm("Archive this goal? Contribution history will be retained.")) void action.run(async () => { await request(`/goals/${id}`, { method: "DELETE" }); refresh(); }, "Goal archived."); }}>Archive goal</button>}</div>
        {goal.status === "COMPLETED" && <p className="notice success">You reached your target. This goal is complete.</p>}
        {goal.status === "PAUSED" && <p className="muted">Resume this goal to add contributions or generate a savings plan.</p>}</section>
      <div className="grid two section-space"><section className="card"><h2>Add a contribution</h2><form onChange={action.clear} onInvalidCapture={action.clear} key={version} onSubmit={contribute}><fieldset disabled={action.busy || goal.status !== "ACTIVE"}><Field label="Contribution amount (BDT)"><AmountInput max={goal.remainingAmount} /></Field><Field label="Source transaction ID (optional)"><input name="transactionId" maxLength={36} pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" placeholder="An owned transaction UUID" /></Field><button type="submit">{action.busy ? "Saving…" : "Add contribution"}</button></fieldset></form>
        <p className="muted">Contributions allocate recorded savings to this goal. They do not transfer wallet funds.</p></section>
        <section className="card"><h2>Edit goal</h2><form onChange={action.clear} onInvalidCapture={action.clear} key={goal.updatedAt} onSubmit={edit}><fieldset disabled={action.busy || !mutable}><Field label="Goal name"><input name="goalName" required maxLength={200} defaultValue={goal.goalName} /></Field><Field label="Target amount (BDT)"><AmountInput name="targetAmount" value={goal.targetAmount} /></Field><Field label="Target date"><input name="targetDate" type="date" required defaultValue={goal.targetDate} /></Field><button type="submit">Save goal changes</button></fieldset></form></section></div>
      <section className="card section-space"><h2>Contribution history</h2><ResourceState {...history} />{history.data?.length === 0 && <Empty>No contributions yet.</Empty>}{history.data && history.data.length > 0 && <div className="table-wrap"><table><thead><tr><th>Date</th><th>Amount</th><th>Source</th></tr></thead><tbody>{history.data.map(item => <tr key={item.contributionId}><td>{date(item.contributionDate)}</td><td>{money(item.amount)}</td><td>{item.transactionId ? "Linked recorded transaction" : "Manual allocation"}</td></tr>)}</tbody></table></div>}<Pagination page={page} meta={history.meta} change={setPage} /></section>
      <section className="card section-space"><h2>Your savings plan</h2><form onChange={() => { setPlan(null); action.clear(); }} onInvalidCapture={() => { setPlan(null); action.clear(); }} className="filters" onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget); void action.run(async () => { setPlan((await request<SavingsPlan>(`/goals/${id}/savings-plan`, { method: "POST", body: { lookbackMonths: numeric(fields, "lookbackMonths"), spendingReductionPercent: numeric(fields, "spendingReductionPercent") } })).data); }, "Savings plan calculated."); }}><fieldset disabled={action.busy || goal.status !== "ACTIVE"} className="filters"><Field label="Lookback months"><input name="lookbackMonths" type="number" min={1} max={12} defaultValue={3} required /></Field><Field label="Spending reduction (%)"><input name="spendingReductionPercent" type="number" min={0} max={50} step="0.1" defaultValue={10} required /></Field><button type="submit">Calculate savings plan</button></fieldset></form>
        {plan && <><div className="grid three"><Metric label="Monthly savings gap" value={money(plan.monthlySavingsGap)} /><Metric label="Projected monthly saving" value={money(plan.projectedMonthlySaving)} /><Metric label="Feasible by target date" value={plan.feasibleByTargetDate ? "Yes" : "No"} /></div><div className="table-wrap"><table><thead><tr><th>Category</th><th>Monthly spending</th><th>Suggested budget</th></tr></thead><tbody>{plan.categoryBudgets.map(item => <tr key={item.categoryId}><td>{item.categoryName}</td><td>{money(item.averageMonthlySpending)}</td><td>{money(item.suggestedMonthlyBudget)}</td></tr>)}</tbody></table></div><Limitations items={plan.notes} /></>}</section>
    </>}</>;
}
