import { describe, expect, it } from "vitest";
import { heroSliderAssets } from "../components/hero-slider-assets";
import { HERO_SLIDE_INTERVAL, HeroSlider } from "../components/hero-slider";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readdir } from "node:fs/promises";

describe("Supplied hero carousel", () => {
  it("discovers every valid supplied PNG in natural order with dimensions", async () => {
    const slides = await heroSliderAssets();
    const names = (await readdir("public")).filter(name => /^heroSlider.*\.png$/i.test(name)).sort((a,b) => a.localeCompare(b,"en",{numeric:true}));
    expect(slides.map(slide => slide.src)).toEqual(names.map(name => `/${name}`));
    expect(slides.every(slide => slide.width > 0 && slide.height > 0)).toBe(true);
  });
  it("renders accessible controls and initially loads only the first banner", async () => {
    const slides = await heroSliderAssets();
    const html = renderToStaticMarkup(createElement(HeroSlider, { slides }));
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).toContain("Previous promotional slide");
    expect(html).toContain("Next promotional slide");
    expect(html.match(/aria-label="Show promotional slide /g)).toHaveLength(slides.length);
    expect(html.match(/<img /g)).toHaveLength(1);
    expect(HERO_SLIDE_INTERVAL).toBe(4500);
  });
});
