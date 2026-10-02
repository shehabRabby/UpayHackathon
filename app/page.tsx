import Link from "next/link";
export default function Home() {
  return <main className="landing"><div className="brand"><span className="brand-mark">u</span> Upay Financial Coach</div>
    <section className="hero"><p className="eyebrow">YOUR MONEY, WITH A PLAN</p><h1>Small steps.<br />Stronger finances.</h1>
      <p>Understand your spending, make progress toward your goals, and talk through your next money decision.</p>
      <div className="actions"><Link className="button" href="/signup">Create an account</Link><Link className="button secondary" href="/login">Sign in</Link></div>
      <p className="muted">Prototype • Recorded transactions, not a live Upay wallet connection.</p></section>
    <div className="grid three"><section className="card"><h2>See the whole picture</h2><p>Income, expenses, and spending trends from your own records.</p></section>
      <section className="card"><h2>Build your savings</h2><p>Track contributions and explore a backend-calculated savings plan.</p></section>
      <section className="card"><h2>Ask your coach</h2><p>Financial guidance in English, Bangla, or Banglish.</p></section></div></main>;
}
