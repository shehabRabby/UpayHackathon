import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "@/components/password-input";
describe("Password presentation preserves the existing field contract", () => {
  it("starts masked and passes through the form name, label target and password-manager attributes", () => {
    const html = renderToStaticMarkup(createElement(PasswordInput, { id: "password-field", name: "password", autoComplete: "new-password", placeholder: "Create your password", minLength: 8, required: true }));
    expect(html).toContain('type="password"'); expect(html).toContain('id="password-field"'); expect(html).toContain('name="password"');
    expect(html).toContain('autoComplete="new-password"'); expect(html).toContain('minLength="8"');
    expect(html).toContain('aria-controls="password-field"'); expect(html).toContain('aria-label="Show password"'); expect(html).toContain('type="button"');
  });
  it("does not expose a disabled field through an enabled visibility control", () => {
    const html = renderToStaticMarkup(createElement(PasswordInput, { disabled: true, autoComplete: "current-password" }));
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });
});
