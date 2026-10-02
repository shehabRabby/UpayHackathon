"use client";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { useAction, useResource } from "@/lib/frontend/hooks";
import { queryPath } from "@/lib/frontend/api-client";
import { numeric } from "@/lib/frontend/forms";
import type { Goal } from "@/lib/frontend/types";
import { AmountInput, Empty, Field, GoalCard, Notice, PageTitle, Pagination, ResourceState, currentDate } from "@/components/ui";
export default function GoalsPage() {
  const { request } = useAuth(), action = useAction();
  const [page, setPage] = useState(1), [status, setStatus] = useState(""), [version, setVersion] = useState(0);
  const goals = useResource<Goal[]>(queryPath("/goals", { page, pageSize: 20, status }));
  const minDate = new Date(new Date(currentDate()).getTime() + 86_400_000).toISOString().slice(0, 10);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const fields = new FormData(event.currentTarget);
    void action.run(async () => { await request("/goals", { method: "POST", body: { goalName: String(fields.get("goalName")).trim(), targetAmount: numeric(fields, "targetAmount"), currentAmount: numeric(fields, "currentAmount"), targetDate: String(fields.get("targetDate")) } }); setVersion(value => value + 1); goals.reload(); }, "Your savings goal is ready.");
  }
  return <><PageTitle title="Savings goals" description="Give your savings a purpose, then build it one contribution at a time." /><div className="grid two">
    <section className="card"><h2>Create savings goal</h2><Notice error={action.error} success={action.success} /><form onChange={action.clear} onInvalidCapture={action.clear} key={version} onSubmit={submit}><fieldset disabled={action.busy}>
      <Field label="Goal name"><input name="goalName" required maxLength={200} placeholder="Emergency fund" /></Field><Field label="Target amount (BDT)"><AmountInput name="targetAmount" /></Field>
      <Field label="Already saved (BDT)"><AmountInput name="currentAmount" value={0} positive={false} /></Field><Field label="Target date"><input name="targetDate" type="date" required min={minDate} /></Field>
      <p className="muted">The target date must be in the future. Already saved cannot exceed the target.</p><button type="submit">{action.busy ? "Creating…" : "Create goal"}</button></fieldset></form></section>
    <section className="card"><div className="row"><h2>Your goals</h2><label className="field">Status<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All goals</option>{["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"].map(value => <option key={value}>{value}</option>)}</select></label></div>
      <ResourceState {...goals} />{goals.data?.length === 0 && <Empty>No goals yet for this status. Create a goal to get started.</Empty>}{goals.data?.map(goal => <GoalCard key={goal.goalId} goal={goal} />)}<Pagination page={page} meta={goals.meta} change={setPage} /></section></div></>;
}
