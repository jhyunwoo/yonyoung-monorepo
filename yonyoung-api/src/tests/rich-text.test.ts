import { describe, expect, it } from "vitest";
import {
  hasMeaningfulRichTextHtml,
  sanitizeRichTextHtml,
  stripRichTextHtmlToText,
} from "../lib/content/rich-text";

describe("rich-text sanitize helpers", () => {
  it("허용되지 않은 태그/이벤트 핸들러를 제거한다", () => {
    const sanitized = sanitizeRichTextHtml(
      `<script>alert(1)</script><p onclick="evil()">hello</p>`,
    );

    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).toContain("<p>hello</p>");
  });

  it("링크 href/target/rel 정책을 강제한다", () => {
    const safe = sanitizeRichTextHtml(
      `<a href="https://example.com" target="_blank" rel="abc">ok</a>`,
    );
    expect(safe).toContain(`href="https://example.com"`);
    expect(safe).toContain(`target="_blank"`);
    expect(safe).toContain(`rel="noopener noreferrer nofollow"`);

    const unsafe = sanitizeRichTextHtml(
      `<a href="javascript:alert(1)" target="_self">x</a>`,
    );
    expect(unsafe).not.toContain("javascript:");
    expect(unsafe).not.toContain(`target="_self"`);
  });

  it("table span 속성은 양의 정수만 허용한다", () => {
    const sanitized = sanitizeRichTextHtml(
      `<table><tr><td colspan="2" rowspan="-1">cell</td></tr></table>`,
    );

    expect(sanitized).toContain(`colspan="2"`);
    expect(sanitized).not.toContain(`rowspan="-1"`);
  });

  it("텍스트 추출 시 NBSP와 다중 공백을 정규화한다", () => {
    const text = stripRichTextHtmlToText(`<p>&nbsp;hello&nbsp;&nbsp;world</p>`);
    expect(text).toBe("hello world");
  });

  it("의미 있는 본문 존재 여부를 판별한다", () => {
    expect(hasMeaningfulRichTextHtml("<p><br/></p>")).toBe(false);
    expect(hasMeaningfulRichTextHtml("<p>내용</p>")).toBe(true);
  });
});
