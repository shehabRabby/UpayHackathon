"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const publicRoutes = new Set(["/", "/about", "/features", "/how-it-works", "/security", "/login", "/signup"]);

// Reset explicit new-page clicks before paint. History navigation remains Next's responsibility.
export function PresentationEffects() {
  const pathname = usePathname();
  const destination = useRef<string | null>(null);
  useLayoutEffect(() => {
    function clicked(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin === window.location.origin && publicRoutes.has(url.pathname) && url.pathname !== window.location.pathname && !url.hash) destination.current = url.pathname;
    }
    function historyNavigation() { destination.current = null; }
    document.addEventListener("click", clicked, true);
    window.addEventListener("popstate", historyNavigation);
    return () => { document.removeEventListener("click", clicked, true); window.removeEventListener("popstate", historyNavigation); };
  }, []);
  useLayoutEffect(() => {
    if (destination.current === pathname) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    destination.current = null;
  }, [pathname]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add("reveal-once"); observer.unobserve(entry.target); }
    }, { threshold: 0.08 });
    // Content remains visible without JS, during loading, and in full-page captures.
    const selector = ".feature-card,.metric,.catalog-row,.workflow-step,.final-cta,.story-hero,.catalog-hero,.workflow-hero,.security-hero,.hero-copy,.hero-visual";
    document.querySelectorAll(selector).forEach(element => observer.observe(element));
    if (pathname === "/") document.querySelectorAll("[data-public-section]:not([data-public-section=hero]) > .container, .capability-strip > div, .home-process > div, .planning-triptych > *, .trust-ribbon, [data-public-section=capabilities] .feature-card").forEach((element, index) => {
      element.classList.add("home-reveal");
      (element as HTMLElement).style.setProperty("--home-delay", `${(index % 3) * 45}ms`);
      observer.observe(element);
    });
    const additions = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) if (node instanceof Element) {
        if (node.matches(selector)) observer.observe(node);
        node.querySelectorAll(selector).forEach(element => observer.observe(element));
      }
    });
    additions.observe(document.body, { childList: true, subtree: true });
    const stop = () => { observer.disconnect(); additions.disconnect(); };
    motion.addEventListener("change", stop, { once: true });
    return () => { stop(); motion.removeEventListener("change", stop); };
  }, [pathname]);
  return null;
}
