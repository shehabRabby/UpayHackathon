import Link from "next/link";
export function Brand({ href = "/" }: { href?: string }) {
  return <Link href={href} className="brand" aria-label="Upay Financial Coach"><span className="brand-mark" aria-hidden="true">u<span /></span><span className="brand-name">UPAY<small>Financial Coach</small></span></Link>;
}
export function ProductIcon({ name, className = "" }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    transactions: "M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4",
    goals: "M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 12l8-8m-4 0h4v4",
    analytics: "M4 20V10m8 10V4m8 16v-7M2 20h20",
    coach: "M4 4h16v12H9l-5 4V4zM8 8h8M8 12h5",
    planning: "M5 3h14v18H5zM8 7h8M8 11h2m4 0h2M8 15h2m4 0h2M8 18h2m4 0h2",
    profile: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3",
    shield: "M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4zM8 12l3 3 5-6",
    arrow: "M4 12h16m-6-6 6 6-6 6",
    menu: "M4 6h16M4 12h16M4 18h16", close: "M5 5l14 14M19 5 5 19",
  };
  return <svg className={`product-icon ${className}`} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name] ?? paths.dashboard} /></svg>;
}
