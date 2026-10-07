"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { useAction, useResource } from "@/lib/frontend/hooks";
import { numeric } from "@/lib/frontend/forms";
import type { Goal, Contribution, SavingsPlan } from "@/lib/frontend/types";
import { AmountInput, Empty, Field, Limitations, Metric, Notice, PageTitle, Pagination, ResourceState, date, money } from "@/components/ui";

function SavingsPlanResult({ plan }: { plan: SavingsPlan }) {
  return <>
    <section className="section-space" aria-labelledby="savings-plan-summary">
      <h3 id="savings-plan-summary">Savings plan summary</h3>
      <p className="muted">Recorded activity before and after your selected spending-reduction assumption.</p>
      {plan.isOverdue && <p className="notice error">The target date has passed. Review the goal deadline before relying on its monthly requirement; the duration below is a scenario estimate, not achievement of the expired deadline.</p>}
      {plan.remainingAmount === 0 && <p className="notice success">Recorded goal savings already meet the target. No further saving is required for this goal; the scenario values below remain the returned calculation.</p>}
      <div className="grid four">
        <Metric label="Remaining goal amount" value={money(plan.remainingAmount)} icon="goals" />
        <Metric label="Required monthly saving" value={money(plan.requiredMonthlySaving)} note={`Target ${date(plan.targetDate)}${plan.isOverdue ? " · Overdue" : ""}`} icon="goals" />
        <Metric label="Available monthly saving" value={typeof plan.availableMonthlySaving === "number" ? money(plan.availableMonthlySaving) : "Not provided"} note="Before assumed spending reductions." />
        <Metric label="Original monthly gap" value={money(plan.monthlySavingsGap)} note="Before assumed spending reductions." />
        <Metric label="Projected monthly saving" value={money(plan.projectedMonthlySaving)} note="With the selected spending-reduction assumption." tone="highlight" />
        <Metric label="Remaining monthly gap" value={money(plan.remainingMonthlyGap)} note={plan.remainingMonthlyGap === 0 ? "Projected saving meets the monthly requirement. Deadline feasibility is assessed separately." : "Additional monthly saving or spending reductions are still needed."} tone={plan.remainingMonthlyGap === 0 ? "success" : "expense"} />
        <Metric label="Estimated saving time" value={plan.projectedMonthsToGoal === null ? "Not estimable" : `${plan.projectedMonthsToGoal} ${plan.projectedMonthsToGoal === 1 ? "month" : "months"}`} note={plan.projectedMonthsToGoal === null ? "No positive projected monthly saving in this scenario." : "Estimated months under this recorded-data scenario."} icon="planning" />
        <Metric label="Feasible by target date" value={plan.feasibleByTargetDate ? "Yes" : "No"} note={plan.feasibleByTargetDate ? "The recorded-data scenario meets the deadline assumptions." : "Review the deadline and scenario notes."} tone={plan.feasibleByTargetDate ? "success" : "expense"} icon="planning" />
      </div>
      <p className="muted">The duration is an estimated number of months, not a guaranteed completion date. It is separate from the What-if Simulator&apos;s hypothetical calendar date.</p>
    </section>
    <section className="section-space" aria-labelledby="savings-plan-context">
      <h3 id="savings-plan-context">Recorded context &amp; assumptions</h3>
      {plan.period ? <p className="muted">Lookback: {date(plan.period.startDate)} to {date(plan.period.endDate)} · {plan.period.days} days · {plan.period.timeZone}</p> : <p className="muted">Lookback dates were not provided in this response.</p>}
      <dl className="grid two">
        <div className="row"><dt>Average monthly recorded income</dt><dd style={{ margin: 0 }}>{money(plan.averageMonthlyIncome)}</dd></div>
        <div className="row"><dt>Average monthly recorded expenses</dt><dd style={{ margin: 0 }}>{money(plan.averageMonthlyExpenses)}</dd></div>
        <div className="row"><dt>Monthly net cash flow</dt><dd style={{ margin: 0 }}>{typeof plan.monthlyNetCashFlow === "number" ? money(plan.monthlyNetCashFlow) : "Not provided"}</dd></div>
        {plan.assumptions && <>
          <div className="row"><dt>Spending reduction assumption</dt><dd style={{ margin: 0 }}>{plan.assumptions.spendingReductionPercent}%</dd></div>
          <div className="row"><dt>Averaging month length</dt><dd style={{ margin: 0 }}>{plan.assumptions.averagingMonthDays} days</dd></div>
        </>}
      </dl>
      {!plan.assumptions && <p className="muted">Calculation assumptions were not provided in this response.</p>}
    </section>
    <section className="section-space" aria-labelledby="savings-plan-categories">
      <h3 id="savings-plan-categories">Potential category savings adjustments</h3>
      <p className="muted">These suggested budgets use your selected reduction assumption. Review essential expenses before choosing any adjustment.</p>
      {plan.categoryBudgets.length ? <div className="table-wrap"><table>
        <caption className="muted">Monthly category amounts returned by the recorded-data Savings Plan</caption>
        <thead><tr><th scope="col">Category</th><th scope="col">Recorded average monthly spending</th><th scope="col">Suggested monthly budget</th><th scope="col">Potential monthly saving</th></tr></thead>
        <tbody>{plan.categoryBudgets.map(item => <tr key={item.categoryId}><th scope="row">{item.categoryName}</th><td>{money(item.averageMonthlySpending)}</td><td>{money(item.suggestedMonthlyBudget)}</td><td>{money(item.potentialMonthlySaving)}</td></tr>)}</tbody>
      </table></div> : <Empty>No recorded expense categories were returned for this lookback.</Empty>}
    </section>
    <section className="section-space" aria-labelledby="savings-plan-notes">
      <h3 id="savings-plan-notes">Scenario notes &amp; limitations</h3>
      <p className="muted">This plan uses recorded activity. It is a scenario estimate, does not move money or guarantee future savings, and may omit unrecorded obligations.</p>
      <Limitations items={plan.notes} />
    </section>
  </>;
}

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
      <section className="card goal-progress-panel section-space"><p className="eyebrow">YOUR SAVINGS JOURNEY</p><div className="row"><h2>{goal.progressPercentage}% saved</h2><span className="badge">{goal.status}</span></div><progress value={goal.progressPercentage} max={100} aria-label="Savings progress" />
        <div className="actions">{mutable && <button className="secondary" disabled={action.busy} onClick={() => action.run(async () => { await request(`/goals/${id}`, { method: "PATCH", body: { status: goal.status === "PAUSED" ? "ACTIVE" : "PAUSED" } }); refresh(); }, goal.status === "PAUSED" ? "Goal resumed." : "Goal paused.")}>{goal.status === "PAUSED" ? "Resume goal" : "Pause goal"}</button>}
          {goal.status !== "COMPLETED" && goal.status !== "CANCELLED" && <button className="danger" disabled={action.busy} onClick={() => { if (window.confirm("Archive this goal? Contribution history will be retained.")) void action.run(async () => { await request(`/goals/${id}`, { method: "DELETE" }); refresh(); }, "Goal archived."); }}>Archive goal</button>}</div>
        {goal.status === "COMPLETED" && <p className="notice success">You reached your target. This goal is complete.</p>}
        {goal.status === "PAUSED" && <p className="muted">Resume this goal to add contributions or generate a savings plan.</p>}</section>
      <div className="grid two section-space"><section className="card form-panel"><p className="eyebrow">BUILD YOUR PROGRESS</p><h2>Add a contribution</h2><form onChange={action.clear} onInvalidCapture={action.clear} key={version} onSubmit={contribute}><fieldset disabled={action.busy || goal.status !== "ACTIVE"}><Field label="Contribution amount (BDT)"><AmountInput placeholder="Enter contribution amount" max={goal.remainingAmount} /></Field><Field label="Source transaction ID (optional)"><input name="transactionId" maxLength={36} pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" placeholder="An owned transaction UUID" /></Field><button type="submit">{action.busy ? "Saving…" : "Add contribution"}</button></fieldset></form>
        <p className="muted">Contributions allocate recorded savings to this goal. They do not transfer wallet funds.</p></section>
        <section className="card form-panel"><p className="eyebrow">GOAL SETTINGS</p><h2>Edit goal</h2><form onChange={action.clear} onInvalidCapture={action.clear} key={goal.updatedAt} onSubmit={edit}><fieldset disabled={action.busy || !mutable}><Field label="Goal name"><input name="goalName" placeholder="e.g. Laptop Fund" required maxLength={200} defaultValue={goal.goalName} /></Field><Field label="Target amount (BDT)"><AmountInput name="targetAmount" placeholder="Enter target amount in BDT" value={goal.targetAmount} /></Field><Field label="Target date"><input name="targetDate" type="date" required defaultValue={goal.targetDate} /></Field><button type="submit">Save goal changes</button></fieldset></form></section></div>
      <section className="card section-space"><h2>Contribution history</h2><ResourceState {...history} />{history.data?.length === 0 && <Empty>No contributions yet.</Empty>}{history.data && history.data.length > 0 && <div className="table-wrap"><table><thead><tr><th>Date</th><th>Amount</th><th>Source</th></tr></thead><tbody>{history.data.map(item => <tr key={item.contributionId}><td>{date(item.contributionDate)}</td><td>{money(item.amount)}</td><td>{item.transactionId ? "Linked recorded transaction" : "Manual allocation"}</td></tr>)}</tbody></table></div>}<Pagination page={page} meta={history.meta} change={setPage} /></section>
      <section className="card section-space"><h2>Your savings plan</h2><form onChange={() => { setPlan(null); action.clear(); }} onInvalidCapture={() => { setPlan(null); action.clear(); }} className="filters" onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget); void action.run(async () => { setPlan((await request<SavingsPlan>(`/goals/${id}/savings-plan`, { method: "POST", body: { lookbackMonths: numeric(fields, "lookbackMonths"), spendingReductionPercent: numeric(fields, "spendingReductionPercent") } })).data); }, "Savings plan calculated."); }}><fieldset disabled={action.busy || goal.status !== "ACTIVE"} className="filters"><Field label="Lookback months"><input name="lookbackMonths" type="number" min={1} max={12} defaultValue={3} required /></Field><Field label="Spending reduction (%)"><input name="spendingReductionPercent" type="number" min={0} max={50} step="0.1" defaultValue={10} required /></Field><button type="submit">Calculate savings plan</button></fieldset></form>
        {plan && <SavingsPlanResult plan={plan} />}</section>
    </>}</>;
}
