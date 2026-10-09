"use client";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { useAction, useResource } from "@/lib/frontend/hooks";
import { numeric } from "@/lib/frontend/forms";
import type { Affordability, Goal, Simulation } from "@/lib/frontend/types";
import { AmountInput, Field, Limitations, Metric, Notice, PageTitle, ResourceState, date, money } from "@/components/ui";

const verdictExplanations: Record<Affordability["decision"], string> = {
  AFFORDABLE: "The purchase fits within the calculated available amount. Recent monthly net cash flow also meets the applied monthly saving requirement, which is zero when no active goal requirement applies.",
  CAUTION: "The purchase fits within the recorded balance, but does not pass every affordability check. It may exceed the amount available after goal reserves and the buffer, or recent monthly net cash flow may fall below the applied monthly saving requirement. Even without an active goal requirement, recent net cash flow must be at least zero.",
  NOT_AFFORDABLE: "The purchase exceeds the recorded cash-flow balance under the current assessment rules.",
  INSUFFICIENT_DATA: "There is not enough recent recorded income or activity for a meaningful assessment. Positive income in the recent lookback is needed before affordability can be established.",
};

function AffordabilityResult({ assessment }: { assessment: Affordability }) {
  return <section className="result-panel section-space" aria-label="Affordability result">
    <p className="eyebrow">ASSESSMENT · RECORDED CONTEXT</p>
    <h3>Affordability decision summary</h3>
    <p className="muted">Verdict from your recorded financial activity</p>
    <h4>{assessment.decision.replaceAll("_", " ")}</h4>
    <p>{verdictExplanations[assessment.decision]}</p>
    <div className="grid two">
      <Metric label="Available for purchase" value={money(assessment.availableForPurchase)} tone="highlight" note="After saved goal reserves and the estimated buffer." />
      <Metric label="Planned purchase" value={money(assessment.purchaseAmount)} />
      <Metric label="Reserved goal savings" value={money(assessment.reservedGoalSavings)} note="Saved amounts across all non-cancelled goals." />
      <Metric label="Emergency buffer" value={money(assessment.emergencyBuffer)} note="An estimate based on recorded expenses." />
    </div>

    <section className="section-space" aria-labelledby="affordability-reserves">
      <h4 id="affordability-reserves">Reserve breakdown</h4>
      <dl>
        <div className="row"><dt>Recorded cash-flow balance</dt><dd style={{ margin: 0 }}>{money(assessment.recordedCashFlowBalance)}</dd></div>
        <div className="row"><dt>Less reserved goal savings</dt><dd style={{ margin: 0 }}>{money(assessment.reservedGoalSavings)}</dd></div>
        <div className="row"><dt>Less estimated emergency buffer</dt><dd style={{ margin: 0 }}>{money(assessment.emergencyBuffer)}</dd></div>
        <div className="row"><dt>Available for purchase</dt><dd style={{ margin: 0 }}><strong>{money(assessment.availableForPurchase)}</strong></dd></div>
      </dl>
      <p className="muted">The calculated available amount has a minimum of BDT 0, even if reserves and the buffer exceed the recorded balance. Selecting a goal does not turn saved-goal reserves on or off.</p>
    </section>

    <section className="section-space" aria-labelledby="affordability-context">
      <h4 id="affordability-context">Financial context behind the decision</h4>
      {assessment.period ? <p className="muted">Recent lookback: {date(assessment.period.startDate)} – {date(assessment.period.endDate)} ({assessment.period.days} days · {assessment.period.timeZone}). Monthly averages use a 30-day month.</p> : <p className="muted">Lookback dates were not provided in this response.</p>}
      <dl>
        <div className="row"><dt>Recorded cash-flow balance</dt><dd style={{ margin: 0 }}>{money(assessment.recordedCashFlowBalance)}</dd></div>
        <div className="row"><dt>Recent average monthly income</dt><dd style={{ margin: 0 }}>{money(assessment.averageMonthlyIncome)}</dd></div>
        <div className="row"><dt>Recent average monthly expenses</dt><dd style={{ margin: 0 }}>{money(assessment.averageMonthlyExpenses)}</dd></div>
        <div className="row"><dt>Recent monthly net cash flow</dt><dd style={{ margin: 0 }}>{money(assessment.monthlyNetCashFlow)}</dd></div>
        <div className="row"><dt>Selected goal monthly requirement</dt><dd style={{ margin: 0 }}>{assessment.selectedGoalMonthlyRequirement === 0 ? "No additional monthly requirement" : money(assessment.selectedGoalMonthlyRequirement)}</dd></div>
      </dl>
      <p className="muted">Only a selected ACTIVE goal adds its required monthly saving pace to the check. A zero requirement can mean no active goal applies, or the selected active goal requires no further monthly saving. Saved-goal reserves still apply.</p>
      <p className="muted">The recorded balance uses recorded income less expenses to date; it is different from recent monthly cash flow.</p>
    </section>

    <section className="section-space" aria-labelledby="affordability-buffer">
      <h4 id="affordability-buffer">Emergency-buffer assumption</h4>
      <p>The estimated buffer uses recorded average monthly expenses{assessment.assumptions ? <> and your selected {assessment.assumptions.emergencyBufferMonths} {assessment.assumptions.emergencyBufferMonths === 1 ? "month" : "months"}</> : " and the selected number of months"}. It is not a verified emergency account, money moved aside, or a guarantee of financial safety.</p>
      {!assessment.assumptions && <p className="muted">The selected buffer months were not provided in this response.</p>}
      {assessment.assumptions?.emergencyBufferMonths === 0 && <p className="muted">No emergency-buffer months were selected for this assessment.</p>}
      {assessment.averageMonthlyExpenses === 0 && <p className="notice">Recorded average monthly expenses are zero, so the estimated buffer is zero. Missing expense records can understate what you need.</p>}
      <p className="muted">Incomplete expense records can make this estimate too low.</p>
    </section>

    <section className="section-space" aria-labelledby="affordability-after-purchase">
      <h4 id="affordability-after-purchase">Recorded cash flow after purchase</h4>
      <p><strong>{money(assessment.balanceAfterPurchase)}</strong></p>
      <p className="muted">This is the hypothetical recorded balance minus the purchase amount. It is different from the amount available after goal reserves and the emergency buffer; those reserves are not deducted from this figure. This assessment does not record a purchase or move money.</p>
    </section>
    <Limitations items={[
      ...assessment.limitations,
      "This assessment uses recorded activity, not a live Upay wallet balance. Unrecorded obligations may be missing.",
      "Saved goal amounts are reserved under the current rules. The emergency buffer is estimated from recorded expenses. This is decision support, not a guarantee.",
    ]} />
    {assessment.explanation && <section className="message assistant section-space" aria-labelledby="affordability-ai"><h4 id="affordability-ai">Optional AI explanation</h4><p className="muted">Additional explanation of the recorded-data assessment. The calculated verdict above remains authoritative.</p><p>{assessment.explanation}</p></section>}
  </section>;
}

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
  return <><PageTitle title="Plan your next move" description="Explore savings scenarios and assess purchases using your recorded finances." /><ResourceState {...goals} /><div className="grid two planning-layout">
    <section className="card planning-input"><p className="eyebrow">INPUT · SAVINGS SCENARIO</p><h2>What-if savings simulator</h2><p className="muted">Hypothetical values only. This does not create transactions or change your goals.</p><Notice error={simulatorAction.error} success={simulatorAction.success} /><form onChange={() => { setSimulation(null); simulatorAction.clear(); }} onInvalidCapture={() => { setSimulation(null); simulatorAction.clear(); }} onSubmit={simulate}><fieldset disabled={simulatorAction.busy}>
      <Field label="Monthly income (BDT)"><AmountInput name="monthlyIncome" placeholder="Enter monthly income" positive={false} /></Field><Field label="Monthly expenses (BDT)"><AmountInput name="monthlyExpenses" placeholder="Enter monthly expenses" positive={false} /></Field><Field label="Requested monthly saving (BDT)"><AmountInput name="monthlySaving" placeholder="Enter desired saving" positive={false} /></Field>
      <Field label="Horizon (months)"><input type="number" name="horizonMonths" placeholder="e.g. 12 months" min={1} max={120} step={1} defaultValue={12} required /></Field><Field label="Scenario goal (optional)"><select name="goalId">{goalOptions}</select></Field><button type="submit">{simulatorAction.busy ? "Calculating…" : "Run simulation"}</button></fieldset></form>
      {simulation && <section className="result-panel section-space" aria-label="Simulation result"><p className="eyebrow">PROJECTED RESULT · HYPOTHETICAL</p><div className="grid two"><Metric label="Projected monthly saving" value={money(simulation.projectedMonthlySaving)} /><Metric label={`Savings over ${simulation.horizonMonths} months`} value={money(simulation.projectedSavings)} /></div><p className="section-space">Monthly net cash flow: {money(simulation.monthlyNetCashFlow)}. Monthly deficit: {money(simulation.monthlyDeficit)}.</p>{simulation.goalId && <p>Goal completion: {simulation.projectedGoalDate ?? "Cannot be projected"}{simulation.monthsToGoal !== null ? ` (${simulation.monthsToGoal} months)` : ""}.</p>}<Limitations items={simulation.limitations} /></section>}</section>
    <section className="card affordability-input"><p className="eyebrow">INPUT · PURCHASE ASSESSMENT</p><h2>Can I afford this?</h2><p className="muted">Uses your recorded cash flow, goal reserves, and an emergency buffer. It cannot verify a real wallet balance.</p><Notice error={affordabilityAction.error} success={affordabilityAction.success} /><form onChange={() => { setAssessment(null); affordabilityAction.clear(); }} onInvalidCapture={() => { setAssessment(null); affordabilityAction.clear(); }} onSubmit={check}><fieldset disabled={affordabilityAction.busy}>
      <Field label="Purchase amount (BDT)"><AmountInput name="purchaseAmount" placeholder="Enter purchase amount" /></Field><Field label="Emergency buffer (months)"><input name="emergencyBufferMonths" type="number" min={0} max={12} step={1} defaultValue={3} required aria-describedby="affordability-buffer-help" /></Field><p id="affordability-buffer-help" className="muted">An estimated reserve based on your recorded average monthly expenses and the number of months you choose.</p><Field label="Check an active goal’s monthly saving pace (optional)"><select name="goalId" aria-describedby="affordability-goal-help">{goalOptions}</select></Field><p id="affordability-goal-help" className="muted">Saved amounts across all non-cancelled goals are already reserved. Selecting an ACTIVE goal also checks whether recent monthly net cash flow meets its required saving pace. Paused, completed or cancelled selections add no monthly requirement.</p>
      <label className="checkbox"><input name="explain" type="checkbox" />Ask AI to explain this assessment</label><p className="muted">When checked, submitting sends this calculated assessment to the configured Gemini provider. AI may make mistakes; the calculated verdict remains authoritative.</p><Field label="Explanation language"><select name="language"><option value="en">English</option><option value="bn">Bangla</option><option value="banglish">Banglish</option></select></Field>
      <button type="submit">{affordabilityAction.busy ? "Assessing…" : "Check affordability"}</button>{affordabilityAction.busy && <p role="status" className="muted">An AI explanation can take up to a minute. For a quicker assessment, leave it unchecked.</p>}</fieldset></form>
      {assessment && <AffordabilityResult assessment={assessment} />}</section></div></>;
}
