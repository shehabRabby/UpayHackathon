import Link from "next/link";
import { PublicPage } from "@/components/public-page";
import { ProductIcon } from "@/components/brand";

export default function About() {
  return <PublicPage>
    <section data-public-section="hero" className="story-hero container">
      <div><p className="eyebrow">DESIGNED AROUND TWO CUSTOMER DECISIONS</p><h1>A savings goal.<br />A purchase decision.</h1><p>This prototype helps customers turn recorded financial activity into a savings plan and a purchase affordability assessment. Transactions, spending analytics and optional AI guidance provide supporting context.</p></div>
      <div className="story-statement"><ProductIcon name="goals" /><span>OUR PURPOSE</span><strong>Understand the saving pace.<br />Consider the purchase.</strong><p>Make the assumptions behind each decision easier to see.</p></div>
    </section>
    <section data-public-section="problem" className="public-section soft-section">
      <div className="container problem-layout">
        <div className="section-heading"><p className="eyebrow">THE PROBLEMS WE ARE EXPLORING</p><h2>What will the goal take?<br />Does the purchase fit?</h2><p>The design focuses on two questions. These are product hypotheses, not findings from verified customer interviews.</p></div>
        <ol className="problem-cards">
          <li><ProductIcon name="goals" /><div><strong>Savings planning</strong><p>A target and a saved amount may leave you needing a clearer view of what remains, the required monthly pace and whether spending adjustments could make the deadline feasible.</p></div></li>
          <li style={{ gridColumn: "auto" }}><ProductIcon name="planning" /><div><strong>Purchase affordability</strong><p>A price alone may not show whether a purchase fits recorded cash flow alongside saved goal funds, an emergency buffer and an active goal&apos;s required monthly saving pace.</p></div></li>
        </ol>
      </div>
    </section>
    <section data-public-section="approach" className="public-section container">
      <div className="section-heading"><p className="eyebrow">OUR APPROACH</p><h2>Use recorded context to examine the decision.</h2></div>
      <div className="decision-loop">{[["Record", "Manually enter financial activity and keep goal contributions current."], ["Plan savings", "Review remaining amounts, monthly requirements and recorded-data plan feasibility."], ["Check a purchase", "Assess a planned amount with saved goal reserves, a buffer and an optional active-goal pace check."], ["Review", "Read the assumptions and limitations; request multilingual guidance if useful."]].map(([title, text], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>
    <section data-public-section="why-ai" className="public-section ai-section">
      <div className="container feature-split">
        <div className="section-heading"><p className="eyebrow">AI AS SUPPORTING ASSISTANCE</p><h2>Calculations first.<br />Optional explanation.</h2><p>Backend code calculates the savings plan and purchase assessment. The AI Coach discusses recorded spending and selected goal context; a separate optional explanation can describe a calculated purchase assessment in English, বাংলা or Banglish.</p></div>
        <div className="responsible-panel"><div className="language-tags"><span>English</span><span lang="bn">বাংলা</span><span>Banglish</span></div><ProductIcon name="coach" /><h3>AI supports your decisions.</h3><p>It does not set the financial verdict, move money or guarantee outcomes. Review its illustrative guidance against your circumstances; AI can make mistakes.</p></div>
      </div>
    </section>
    <section data-public-section="ecosystem" className="public-section container">
      <div className="section-heading"><p className="eyebrow">SUPPORTING CONTEXT, FOCUSED OUTCOMES</p><h2>Records support the plan and the purchase check.</h2></div>
      <div className="ecosystem" aria-label="Recorded activity and spending context support savings planning and purchase affordability, with optional AI guidance">
        <div className="ecosystem-source"><ProductIcon name="transactions" /><strong>Recorded financial activity</strong><span>Income + expenses</span></div>
        <div className="ecosystem-path"><ProductIcon name="arrow" /><span>Dashboard + spending context</span></div>
        <div className="ecosystem-tools">{["Savings planning", "Purchase affordability", "Optional AI guidance"].map(label => <span key={label}>{label}</span>)}</div>
      </div>
      <p className="muted">Goal contributions are separately recorded. The Savings Plan uses recorded activity; the What-if Simulator uses hypothetical inputs. Wellness and profile tools remain secondary utilities.</p>
    </section>
    <section data-public-section="responsibility" className="public-section soft-section">
      <div className="container feature-split"><div className="section-heading"><p className="eyebrow">RESPONSIBLE BY DESIGN</p><h2>You keep the control.</h2><p>Plans and assessments depend on the information you record and the assumptions you choose. Incomplete records can limit the result; an assessment is not a guarantee that a purchase is safe.</p></div><ul className="responsibility-list"><li>User-recorded financial information</li><li>Illustrative AI guidance</li><li>No execution of financial transactions</li><li>There is no live Upay wallet connection</li></ul></div>
    </section>
    <section data-public-section="vision" className="public-section container vision-section">
      <p className="eyebrow">AN MFS-ORIENTED PROTOTYPE</p><h2>Explore decisions with familiar recorded activity.</h2>
      <p>Designed for an MFS-oriented customer context, the prototype supports BDT, Bangladesh/Dhaka dates, manually recorded cash in, cash out, merchant payments and recharge, plus multilingual coaching. These records support planning; they do not execute those activities or synchronize a wallet.</p>
      <p>This Upay-inspired hackathon project explores that use case. It has no verified customer interviews, makes no claim of superiority over other budgeting tools, and is not an official or endorsed Upay application or professional financial advisory service.</p>
      <Link className="button" href="/features">Explore what the product can do <ProductIcon name="arrow" /></Link>
    </section>
  </PublicPage>;
}
