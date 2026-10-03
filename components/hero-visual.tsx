import { ProductIcon } from "./brand";

// Original, static product illustration. No wallet claims, account data or AI requests.
export function HeroVisual() {
  return <div className="hero-visual" aria-label="Illustrative financial coaching workspace">
    <div className="hero-orbit" aria-hidden="true" />
    <div className="hero-visual-label"><span>YOUR MONEY, IN FOCUS</span><ProductIcon name="analytics" /></div>
    <div className="hero-phone"><div className="phone-camera" aria-hidden="true" /><div className="phone-heading"><span className="coach-avatar">AI</span><div><strong>Financial Coach</strong><small>Illustrative product preview</small></div></div>
      <div className="phone-balance"><small>Recorded monthly cash flow</small><strong>BDT 15,000</strong><span>Your records. A clearer picture.</span></div>
      <div className="phone-goal"><div className="row"><strong>Emergency fund</strong><ProductIcon name="goals" /></div><p><b>BDT 10,000</b> <small>of BDT 40,000</small></p><progress value={25} max={100} aria-label="Demo savings goal 25 percent complete" /><div className="row"><small>25% saved</small><small>One step at a time</small></div></div>
      <div className="phone-chart"><span>Understand your cash flow</span><div aria-hidden="true">{[45,70,55,85,65,100].map((height,index) => <i key={index} style={{height:`${height}%`}} />)}</div><small>Income & expenses · Static example</small></div>
    </div>
    <div className="hero-coach-note"><span className="icon-tile"><ProductIcon name="coach" /></span><div><strong>Make your next move clearer.</strong><p>Record. Understand. Plan.</p><small>English · <span lang="bn">বাংলা</span> · Banglish</small></div></div>
    <span className="hero-demo-label">Demo values · No live wallet connection</span>
  </div>;
}
