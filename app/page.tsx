import Link from "next/link";
import { PublicActions } from "@/components/public-layout";
import { PublicPage, FinalCta } from "@/components/public-page";
import { ProductPreview } from "@/components/product-preview";
import { HeroVisual } from "@/components/hero-visual";
import { HeroSlider } from "@/components/hero-slider";
import { heroSliderAssets } from "@/components/hero-slider-assets";
import { ProductIcon } from "@/components/brand";
import { ChatPreview, GoalPreview, PlanningPreview } from "@/components/public-previews";

export default async function Home() {
  const slides = await heroSliderAssets();
  return <PublicPage>
    <section data-public-section="hero" className="home-hero home-intro">
      <div className="container landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">FINANCIAL DECISION SUPPORT FOR CUSTOMERS</p>
          <h1>Plan your savings.<br /><span>Check your purchase.</span></h1>
          <p className="hero-description">Use your recorded financial activity to plan a savings goal and assess a planned purchase. Understand your saving pace, saved goal funds and emergency buffer, with optional multilingual AI guidance.</p>
          <PublicActions explore />
          <small className="hero-footnote">Upay-inspired prototype · Recorded data, no live wallet connection.</small>
        </div>
        <HeroVisual />
      </div>
    </section>
    <div className="container"><p className="muted">Supplied Upay promotional imagery · External, illustrative context only. These images do not represent prototype functionality or current offers.</p></div>
    <HeroSlider slides={slides} />
    <section data-public-section="capability-stats" className="capability-strip container" aria-label="Product focus">
      {[["2", "Core decisions", "Savings planning + purchase affordability"], ["1", "Recorded context", "Manually entered financial activity"], ["3", "Language modes", "English · বাংলা · Banglish"], ["0", "Money transfers", "Planning and assessment only"]].map(([number, title, text]) => <div key={title}><strong>{number}</strong><div><h2>{title}</h2><p>{text}</p></div></div>)}
    </section>
    <section data-public-section="planning" className="public-section container">
      <div className="section-heading">
        <p className="eyebrow">YOUR GOAL. YOUR PLANNED PURCHASE.</p>
        <h2>Two decisions, grounded in your records.</h2>
        <p>Review what remains to save and the monthly pace your goal needs. Generate a Savings Plan from recorded activity, or explore a separate hypothetical scenario. For a purchase, check recorded cash flow after reserving saved goal funds and an emergency buffer.</p>
        <p>Backend calculations determine the plan and affordability assessment. AI provides optional explanation; incomplete records can limit either result.</p>
      </div>
      <div className="planning-triptych"><GoalPreview /><PlanningPreview /><PlanningPreview affordability /></div>
      <Link className="inline-link section-space" href="/about#validation-framework">See our proposed measures of customer decision clarity <ProductIcon name="arrow" /></Link>
    </section>
    <section data-public-section="capabilities" className="public-section container">
      <div className="section-heading"><p className="eyebrow">CORE DECISIONS, SUPPORTED BY CONTEXT</p><h2>Start with a goal or a purchase.</h2></div>
      <div className="capability-grid">
        {[["goals", "Goal-based savings planning", "Review remaining savings, required monthly pace, a recorded-data plan and deadline feasibility."], ["planning", "Purchase affordability", "Assess a purchase with saved goal reserves, an emergency buffer and an optional active-goal pace check."], ["transactions", "Recorded financial activity", "Manually record cash in, cash out, merchant payments and recharge; edit, search and filter entries."], ["dashboard", "Dashboard context", "Review recorded balance, income, expenses and goal savings before planning."], ["analytics", "Spending context", "Use categories and monthly patterns to understand the activity behind a plan."], ["coach", "Optional multilingual guidance", "Discuss recorded spending and selected goal context in English, বাংলা or Banglish."]].map(([icon, title, text]) => <article className="feature-card" key={title}><span className="icon-tile"><ProductIcon name={icon} /></span><h3>{title}</h3><p>{text}</p></article>)}
      </div>
      <Link className="inline-link section-space" href="/features">Explore all features <ProductIcon name="arrow" /></Link>
    </section>
    <section data-public-section="workflow" className="public-section container">
      <div className="section-heading"><p className="eyebrow">FROM RECORDS TO A DECISION</p><h2>Plan a goal. Check a purchase. Review the context.</h2><p>Follow either journey when you need it. Explanation is optional, and you choose what to do with the result.</p></div>
      <div className="home-process">{["Record activity", "Choose a goal", "Review the plan", "Enter a purchase", "Check the result", "Optional guidance"].map((title, index) => <div key={title}><span>0{index + 1}</span><strong>{title}</strong><ProductIcon name="arrow" /></div>)}</div>
      <Link className="inline-link section-space" href="/how-it-works">See the two journeys <ProductIcon name="arrow" /></Link>
    </section>
    <section data-public-section="dashboard" className="public-section soft-section">
      <div className="container feature-split"><ProductPreview /><div className="section-heading">
        <p className="eyebrow">THE CONTEXT BEHIND YOUR DECISIONS</p><h2>See what your records say.</h2>
        <p>The dashboard and spending analytics support your savings and purchase checks. Their recorded balance describes entered activity, not money verified in a wallet.</p>
        <ul className="feature-list"><li><ProductIcon name="dashboard" />Recorded income, expenses and goal savings</li><li><ProductIcon name="analytics" />Cash-flow patterns and spending categories</li><li><ProductIcon name="goals" />Targets, contributions and remaining amounts</li></ul>
        <small className="muted">Preview values are illustrative, never your account data. Wellness assessments are a secondary, illustrative view.</small>
      </div></div>
    </section>
    <section data-public-section="ai" className="public-section ai-section">
      <div className="container feature-split"><div className="section-heading">
        <p className="eyebrow">OPTIONAL MULTILINGUAL SUPPORT</p><h2>Ask about the context.<br />In your own language.</h2>
        <p>Use the AI Coach to discuss recorded spending and selected goal information. The purchase tool can also explain its calculated assessment when requested. AI offers illustrative guidance; backend calculations remain authoritative.</p>
        <div className="language-tags"><span>English</span><span lang="bn">বাংলা</span><span>Banglish</span></div>
        <Link className="button brand-cta" href="/features#ai-coach">Explore AI Coach <ProductIcon name="arrow" /></Link>
      </div><ChatPreview /></div>
    </section>
    <section data-public-section="trust">
      <div className="container trust-ribbon"><div><ProductIcon name="shield" /><strong>Authenticated access</strong></div><div><ProductIcon name="profile" /><strong>User-isolated records</strong></div><div><ProductIcon name="transactions" /><strong>No live wallet connection</strong></div><Link href="/security">Understand the boundaries</Link></div>
      <FinalCta />
    </section>
  </PublicPage>;
}
