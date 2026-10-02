"use client";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { useAction, useResource } from "@/lib/frontend/hooks";
import { numeric } from "@/lib/frontend/forms";
import type { Affordability, Goal, Simulation } from "@/lib/frontend/types";
import { AmountInput, Field, Limitations, Metric, Notice, PageTitle, ResourceState, money } from "@/components/ui";
export default function PlanningPage() {
  const { request } = useAuth(), simulatorAction = useAction(), affordabilityAction = useAction();
  const goals = useResource<Goal[]>("/goals?page=1&pageSize=100");
  const [simulation, setSimulation] = useState<Simulation | null>(null), [assessment, setAssessment] = useState<Affordability | null>(null);
  const goalOptions = <><option value="">No specific goal</option>{goals.data?.map(goal => <option key={goal.goalId} value={goal.goalId}>{goal.goalName} ({goal.status})</option>)}</>;
  function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const fields = new FormData(event.currentTarget); setSimulation(null);
    void simulatorAction.run(async () => { setSimulation((await request<Simulation>("/simulator/what-if", { method: "POST", body: {
      monthlyIncome: numeric(fields, "monthlyIncome"), monthlyExpenses: numeric(fields, "monthlyExpenses"), monthlySaving: numeric(fields, "monthlySaving"), horizonMonths: numeric(fields, "horizonMonths"), ...(fields.get("goalId") ? { goalId: fields.get("goalId") } : {}),
    } })).data); }, "Your scenario is calculated. No records were changed.");
  }
  function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const fields = new FormData(event.currentTarget); setAssessment(null);
    void affordabilityAction.run(async () => { setAssessment((await request<Affordability>("/affordability/check", { method: "POST", timeoutMs: 70_000, body: {
      purchaseAmount: numeric(fields, "purchaseAmount"), emergencyBufferMonths: numeric(fields, "emergencyBufferMonths"), explain: fields.get("explain") === "on", language: fields.get("language"), ...(fields.get("goalId") ? { goalId: fields.get("goalId") } : {}),
    } })).data); }, "Your purchase assessment is ready.");
  }
  return <><PageTitle title="Plan your next move" description="Explore a savings scenario or assess a purchase using backend calculations." /><ResourceState {...goals} /><div className="grid two">
    <section className="card"><h2>What-if savings simulator</h2><p className="muted">Hypothetical values only. This does not create transactions or change your goals.</p><Notice error={simulatorAction.error} success={simulatorAction.success} /><form onChange={() => { setSimulation(null); simulatorAction.clear(); }} onInvalidCapture={() => { setSimulation(null); simulatorAction.clear(); }} onSubmit={simulate}><fieldset disabled={simulatorAction.busy}>
      <Field label="Monthly income (BDT)"><AmountInput name="monthlyIncome" positive={false} /></Field><Field label="Monthly expenses (BDT)"><AmountInput name="monthlyExpenses" positive={false} /></Field><Field label="Requested monthly saving (BDT)"><AmountInput name="monthlySaving" positive={false} /></Field>
      <Field label="Horizon (months)"><input type="number" name="horizonMonths" min={1} max={120} step={1} defaultValue={12} required /></Field><Field label="Scenario goal (optional)"><select name="goalId">{goalOptions}</select></Field><button type="submit">{simulatorAction.busy ? "Calculating…" : "Run simulation"}</button></fieldset></form>
      {simulation && <section className="section-space" aria-label="Simulation result"><div className="grid two"><Metric label="Projected monthly saving" value={money(simulation.projectedMonthlySaving)} /><Metric label={`Savings over ${simulation.horizonMonths} months`} value={money(simulation.projectedSavings)} /></div><p className="section-space">Monthly net cash flow: {money(simulation.monthlyNetCashFlow)}. Monthly deficit: {money(simulation.monthlyDeficit)}.</p>{simulation.goalId && <p>Goal completion: {simulation.projectedGoalDate ?? "Cannot be projected"}{simulation.monthsToGoal !== null ? ` (${simulation.monthsToGoal} months)` : ""}.</p>}<Limitations items={simulation.limitations} /></section>}</section>
    <section className="card"><h2>Can I afford this?</h2><p className="muted">Uses your recorded cash flow, goal reserves, and an emergency buffer. It cannot verify a real wallet balance.</p><Notice error={affordabilityAction.error} success={affordabilityAction.success} /><form onChange={() => { setAssessment(null); affordabilityAction.clear(); }} onInvalidCapture={() => { setAssessment(null); affordabilityAction.clear(); }} onSubmit={check}><fieldset disabled={affordabilityAction.busy}>
      <Field label="Purchase amount (BDT)"><AmountInput name="purchaseAmount" /></Field><Field label="Emergency buffer (months)"><input name="emergencyBufferMonths" type="number" min={0} max={12} step={1} defaultValue={3} required /></Field><Field label="Protect a selected goal (optional)"><select name="goalId">{goalOptions}</select></Field>
      <label className="checkbox"><input name="explain" type="checkbox" />Ask AI to explain the backend assessment</label><Field label="Explanation language"><select name="language"><option value="en">English</option><option value="bn">Bangla</option><option value="banglish">Banglish</option></select></Field>
      <button type="submit">{affordabilityAction.busy ? "Assessing…" : "Check affordability"}</button>{affordabilityAction.busy && <p role="status" className="muted">An AI explanation can take up to a minute. For a quicker assessment, leave it unchecked.</p>}</fieldset></form>
      {assessment && <section className="section-space" aria-label="Affordability result"><h3>{assessment.decision.replaceAll("_", " ")}</h3><div className="grid two"><Metric label="Available for purchase" value={money(assessment.availableForPurchase)} /><Metric label="Balance after purchase" value={money(assessment.balanceAfterPurchase)} /></div><p className="section-space">Reserved goal savings: {money(assessment.reservedGoalSavings)}. Emergency buffer: {money(assessment.emergencyBuffer)}.</p><Limitations items={assessment.limitations} />{assessment.explanation && <div className="message assistant"><small>AI explanation</small>{assessment.explanation}</div>}</section>}</section></div></>;
}
