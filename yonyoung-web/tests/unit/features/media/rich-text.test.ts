import { describe, expect, it } from "vitest";

import {
  hasMeaningfulRichTextHtml,
  sanitizeRichTextHtml,
  summarizeRichTextHtml,
} from "@/features/media/rich-text/rich-text";

describe("features/media/rich-text", () => {
  it("detects meaningful html content", () => {
    expect(hasMeaningfulRichTextHtml("<p>Hello</p>")).toBe(true);
    expect(hasMeaningfulRichTextHtml("<p>&nbsp;</p><div> </div>")).toBe(false);
  });

  it("summarizes stripped rich text", () => {
    const html = "<p>Hello&nbsp;World</p><p>Second line</p>";
    expect(summarizeRichTextHtml(html, 5)).toBe("Hello...");
    expect(summarizeRichTextHtml(html, 100)).toBe("Hello World Second line");
  });

  it("sanitizes dangerous tags, attributes, and javascript links", () => {
    const sanitized = sanitizeRichTextHtml(
      '<p>Hello</p><script>alert(1)</script><a href="javascript:alert(1)" onclick="x()">bad</a>',
    );

    expect(sanitized).toContain("<p>Hello</p>");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("onclick=");
    expect(sanitized).not.toContain("javascript:alert");
  });
});
