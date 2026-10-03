"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { HeroSlide } from "./hero-slider-assets";

export const HERO_SLIDE_INTERVAL = 4500;

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [target, setTarget] = useState(0), [displayed, setDisplayed] = useState(0);
  const [visited, setVisited] = useState(() => new Set([0]));
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false), [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(true);
  const loaded = useRef(new Set<number>()), targetRef = useRef(0);
  const root = useRef<HTMLElement>(null), touchStart = useRef<number | null>(null);
  const count = slides.length;

  function select(index: number) {
    const next = (index + count) % count;
    targetRef.current = next;
    setTarget(next);
    setVisited(previous => new Set([...previous, next]));
    if (loaded.current.has(next)) setDisplayed(next);
  }

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(motion.matches);
    update();
    motion.addEventListener("change", update);
    const visibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => { motion.removeEventListener("change", update); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  useEffect(() => {
    if (count < 2 || paused || reduced || hovered || focused || !visible) return;
    const timer = window.setInterval(() => {
      const next = (targetRef.current + 1) % count;
      targetRef.current = next;
      setTarget(next);
      setVisited(previous => new Set([...previous, next]));
      if (loaded.current.has(next)) setDisplayed(next);
    }, HERO_SLIDE_INTERVAL);
    return () => window.clearInterval(timer);
  }, [count, paused, reduced, hovered, focused, visible, target]);

  if (!count) return null;
  return <section ref={root} className="hero-slider" aria-label="Promotional image carousel" aria-roledescription="carousel"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
    onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); select(target + (event.key === "ArrowRight" ? 1 : -1)); } }}>
    <div className="hero-slider-stage" style={{ "--banner-aspect": Math.min(...slides.map(slide => slide.width / slide.height)) } as CSSProperties} onTouchStart={event => { touchStart.current = event.touches[0]?.clientX ?? null; setHovered(true); }}
      onTouchEnd={event => { const start = touchStart.current; const end = event.changedTouches[0]?.clientX; if (start !== null && end !== undefined && Math.abs(end - start) > 45) select(target + (end < start ? 1 : -1)); touchStart.current = null; setHovered(false); }}
      onTouchCancel={() => { touchStart.current = null; setHovered(false); }}>
      {slides.map((slide, index) => visited.has(index) && <div key={slide.src} className="hero-slide" data-active={index === displayed} aria-hidden={index !== displayed} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${count}`}>
        <Image src={slide.src} alt={`User-supplied Upay promotional banner ${index + 1}`} width={slide.width} height={slide.height}
          sizes="100vw"
          preload={index === 0} loading={index === 0 ? undefined : "lazy"}
          onLoad={() => { loaded.current.add(index); if (targetRef.current === index) setDisplayed(index); }} />
      </div>)}
    </div>
    {count > 1 && <div className="hero-slider-controls">
      <button type="button" className="slider-arrow slider-previous" aria-label="Previous promotional slide" onClick={() => select(target - 1)}><span aria-hidden="true">‹</span></button>
      <div className="slider-dots" aria-label="Choose promotional slide">{slides.map((slide, index) => <button key={slide.src} type="button" aria-label={`Show promotional slide ${index + 1}`} aria-current={displayed === index ? "true" : undefined} onClick={() => select(index)}><span /></button>)}</div>
      <button type="button" className="slider-arrow slider-next" aria-label="Next promotional slide" onClick={() => select(target + 1)}><span aria-hidden="true">›</span></button>
      {!reduced && <button type="button" className="slider-play" aria-label={paused ? "Resume slideshow" : "Pause slideshow"} onClick={() => setPaused(value => !value)}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={paused ? "M7 4v16l14-8z" : "M6 4h4v16H6zM14 4h4v16h-4z"} /></svg></button>}
    </div>}
    <span className="slider-status" role="status" aria-live={focused || paused || reduced ? "polite" : "off"}>Slide {displayed + 1} of {count}</span>
  </section>;
}
