import { ProductIcon } from "./brand";

// Static public demonstrations. These components never request account data.
export function GoalPreview() {
  return <div className="mini-product"><div className="row"><span className="icon-tile"><ProductIcon name="goals" /></span><span className="demo-label">Illustrative demo</span></div><h3>Emergency fund</h3><strong>BDT 10,000 <small>of BDT 40,000</small></strong><progress value={25} max={100} aria-label="Example savings goal: 25 percent" /><div className="row"><span>25% saved</span><span>BDT 30,000 remaining</span></div><p className="muted">Contributions bring your recorded goal closer.</p></div>;
}
export function TransactionPreview() {
  return <div className="mini-product"><div className="row"><h3>Recorded activity</h3><span className="demo-label">Static example</span></div>{[["Monthly income", "+ BDT 50,000", "Cash in"], ["Groceries", "− BDT 6,500", "Food"], ["Daily commute", "− BDT 2,000", "Transport"]].map(([label,amount,category]) => <div className="demo-transaction" key={label}><ProductIcon name="transactions" /><div><strong>{label}</strong><small>{category}</small></div><span>{amount}</span></div>)}<div className="demo-toolbar"><span>Search records</span><span>Type · Category · Date</span></div></div>;
}
export function ChatPreview() {
  return <div className="demo-chat"><div className="preview-top"><span><ProductIcon name="coach" />AI Financial Coach</span><span className="demo-label">Static example</span></div><div className="demo-chat-user">How can I start building an emergency fund?</div><div className="demo-chat-answer"><span className="coach-avatar" aria-hidden="true">AI</span><p>Choose a target that fits your needs. Review recorded income and essential expenses, then choose a monthly contribution you can maintain.</p></div><div className="demo-composer">English · <span lang="bn">বাংলা</span> · Banglish</div></div>;
}
export function PlanningPreview({ affordability = false }: { affordability?: boolean }) {
  return <div className="mini-product planning-preview"><p className="eyebrow">{affordability ? "PURCHASE ASSESSMENT" : "WHAT-IF SAVINGS"} · DEMO</p><h3>{affordability ? "Look beyond the price tag." : "A scenario, not a commitment."}</h3>{(affordability ? [["Purchase amount", "BDT 8,000"], ["Context", "Cash flow + goal reserves"], ["Buffer", "Selected emergency horizon"]] : [["Monthly saving", "BDT 5,000"], ["Horizon", "12 months"]]).map(([label,value]) => <div className="scenario-line" key={label}><span>{label}</span><strong>{value}</strong></div>)}{!affordability && <div className="scenario-total"><small>Projected savings</small><strong>BDT 60,000</strong></div>}<small>{affordability ? "Your records determine the assessment. No purchase is executed." : "Illustrative scenario. No records or wallet funds change."}</small></div>;
}
