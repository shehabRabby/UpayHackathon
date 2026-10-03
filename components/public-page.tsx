import type { ReactNode } from "react";
import { PublicActions, PublicFooter, PublicHeader } from "./public-layout";

export function PublicPage({ children }: { children: ReactNode }) {
  return <><PublicHeader /><main id="main-content" className="public-main">{children}</main><PublicFooter /></>;
}
export function PublicHero({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <section className="route-hero"><div className="container"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p>{children}</div></section>;
}
export function FinalCta() {
  return <section className="container final-cta"><div><p className="eyebrow">YOUR NEXT MOVE STARTS HERE</p><h2>Build better financial habits,<br />one decision at a time.</h2><p>Record your activity. Understand your options. Make a plan.</p></div><PublicActions dashboardLabel="Open dashboard" signupLabel="Create an account" /></section>;
}
