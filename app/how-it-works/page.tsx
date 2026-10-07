import { PublicPage } from "@/components/public-page";
import { PublicActions } from "@/components/public-layout";
import { ProductIcon } from "@/components/brand";
import { ChatPreview, GoalPreview, TransactionPreview, PlanningPreview } from "@/components/public-previews";

const journeys = [
  {
    id: "savings-journey",
    title: "Journey A — Plan a savings goal",
    description: "Use recorded activity to understand the required saving pace and deadline feasibility. Explore a hypothetical scenario separately if you want to compare assumptions.",
    steps: [
      { icon: "transactions", title: "Start with recorded financial activity", text: "Manually record income and expenses, including MFS-style cash in, cash out, merchant payments and recharge. Review dashboard and spending context; these entries are not synchronized wallet data.", preview: "Recorded income + Expenses + Dates", visual: <TransactionPreview /> },
      { icon: "goals", title: "Create or select a savings goal", text: "Set a target amount and date, record saved amounts and contributions, then review what remains and the required monthly saving pace. Pause/resume eligible goals when priorities change.", preview: "Target + Saved → Remaining + Monthly requirement", visual: <GoalPreview /> },
      { icon: "goals", title: "Generate the recorded-data Savings Plan", text: "In Goal Details, generate a Savings Plan with a recorded-activity lookback and a spending-reduction assumption. Review the monthly savings gap, category budgets, projected monthly saving and whether that pace appears feasible by the target date. The backend calculates this plan; the result depends on recorded history and assumptions.", preview: "Recorded activity → Gap + Budgets + Deadline feasibility", visual: null },
      { icon: "planning", title: "Optionally explore a hypothetical What-if", text: "In the separate What-if Simulator, enter hypothetical monthly income, expenses, desired saving and a horizon. Select a goal to see completion time and date estimates where possible. These scenario estimates are separate from the recorded-data plan and do not change your records.", preview: "Hypothetical inputs → Savings + Timeline estimates", visual: <PlanningPreview /> },
      { icon: "coach", title: "Optionally discuss the goal context", text: "Ask the AI Coach about recorded spending and your selected goal in English, বাংলা or Banglish. Review its illustrative guidance and keep useful recommendations. Coaching supports understanding; it does not calculate or replace the Savings Plan.", preview: "Optional question → Multilingual guidance", visual: <ChatPreview /> },
    ],
  },
  {
    id: "purchase-journey",
    title: "Journey B — Check a purchase",
    description: "Assess a planned amount using recorded cash flow, saved goal funds and an emergency-buffer assumption. A savings goal is optional for this journey.",
    steps: [
      { icon: "transactions", title: "Review your records and enter a purchase", text: "Keep recorded income, expenses and goal contributions current, then enter the planned purchase amount in the affordability tool. The assessment uses this recorded context, not a verified wallet balance.", preview: "Recorded activity + Planned purchase amount", visual: <TransactionPreview /> },
      { icon: "goals", title: "Choose a buffer and optional active goal", text: "Choose the emergency-buffer horizon. Saved funds in all non-cancelled goals are always reserved, including paused and completed goals. Selecting an ACTIVE goal adds a check of its required monthly saving pace; it does not switch other goal reserves on or off.", preview: "Emergency-buffer assumption + Optional ACTIVE goal", visual: null },
      { icon: "shield", title: "Review the calculated affordability assessment", text: "Read the deterministic verdict alongside reserved goal savings, the emergency buffer and available amount. Check the recorded-data limitations, including missing income or expenses. Backend calculations determine the verdict; it is decision support, not a guarantee or payment instruction.", preview: "Recorded context → Verdict + Reserves + Available amount", visual: <PlanningPreview affordability /> },
      { icon: "coach", title: "Optionally request a multilingual explanation", text: "Enable the optional explanation in English, বাংলা or Banglish when you want guidance on the calculated purchase assessment. AI explains the result without changing its verdict, moving money or recording a purchase. You make the final decision.", preview: "Calculated assessment → Optional explanation", visual: null },
    ],
  },
];

export default function HowItWorks() {
  return <PublicPage>
    <section className="workflow-hero container">
      <p className="eyebrow">TWO CUSTOMER JOURNEYS</p>
      <h1>Plan the saving pace.<br />Check the purchase fit.</h1>
      <p>Create an account and sign in; confirm email when required. Then record financial activity and choose the decision you want to explore. Both journeys work without AI.</p>
      <div className="workflow-key"><span>Savings planning</span><ProductIcon name="arrow" /><span>Purchase affordability</span></div>
    </section>
    {journeys.map(journey => <section className="container" aria-labelledby={journey.id} key={journey.id}>
      <div className="section-heading"><p className="eyebrow">CHOOSE THE DECISION YOU NEED</p><h2 id={journey.id}>{journey.title}</h2><p>{journey.description}</p></div>
      <div className="workflow-timeline">{journey.steps.map((step,index) => <section className="workflow-step" data-workflow-step key={step.title}>
        <div className="timeline-number">{String(index+1).padStart(2,"0")}</div>
        <div className="timeline-copy"><p className="eyebrow">{journey.id === "savings-journey" ? "SAVINGS PLANNING" : "PURCHASE AFFORDABILITY"}</p><h2>{step.title}</h2><p>{step.text}</p></div>
        {step.visual ? <div className="timeline-visual">{step.visual}</div> : <div className="step-preview"><ProductIcon name={step.icon} /><strong>{step.preview}</strong><small>Workflow preview · No action performed</small></div>}
      </section>)}</div>
    </section>)}
    <section className="container workflow-finish">
      <p className="eyebrow">RETURN AS YOUR RECORDS CHANGE</p>
      <h2 className="workflow-loop">{["Record", "Plan savings", "Check a purchase", "Review context", "Optional explanation"].map((label,index) => <span key={label}>{index > 0 && <i aria-hidden="true">↓</i>}{label}</span>)}</h2>
      <p>Keep your records current, revisit the relevant decision and review the assumptions before acting.</p>
      <PublicActions signupLabel="Create an account" dashboardLabel="Continue in your dashboard" />
    </section>
  </PublicPage>;
}
