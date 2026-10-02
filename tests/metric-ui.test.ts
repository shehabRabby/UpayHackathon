import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Metric, money } from "@/components/ui";

describe("Financial metric presentation", () => {
  it("retains every formatted currency character and keeps the amount together", () => {
    const formatted = money(1_000_000_000_000);
    const html = renderToStaticMarkup(createElement(Metric, { label: "Recorded balance", value: formatted }));
    const displayed = /<strong[^>]*>(.*?)<\/strong>/.exec(html)![1].replace(/<[^>]*>/g, "");
    expect(displayed).toBe(formatted);
    expect(html).toContain('class="long-value"');
    expect(html).toContain(`<span class="currency-value">${formatted.replace(/^BDT\s+/, "")}</span>`);
  });
  it("preserves non-currency metrics and their original content", () => {
    const html = renderToStaticMarkup(createElement(Metric, { label: "Progress", value: "25%", note: "Recorded goal progress" }));
    expect(html).toContain("<strong>25%</strong>");
    expect(html).not.toContain('class="currency-value"');
    expect(html).toContain("Recorded goal progress");
  });
});
