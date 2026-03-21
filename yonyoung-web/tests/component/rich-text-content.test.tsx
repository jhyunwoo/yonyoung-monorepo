import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { RichTextContent } from "@/features/media/rich-text/rich-text-content";

describe("RichTextContent", () => {
  it("sanitizes unsafe HTML before rendering", () => {
    const { container } = render(
      <RichTextContent
        html={[
          "<p>Hello</p>",
          "<script>alert('xss')</script>",
          '<a href="javascript:alert(1)" onclick="alert(2)">bad</a>',
          '<a href="https://safe.example.com" target="_blank">safe</a>',
        ].join("")}
      />,
    );

    expect(container.querySelector("script")).toBeNull();

    const links = [...container.querySelectorAll("a")];
    expect(links).toHaveLength(2);
    expect(links[0]?.getAttribute("href")).toBe("");
    expect(links[0]?.getAttribute("onclick")).toBeNull();
    expect(links[1]?.getAttribute("href")).toBe("https://safe.example.com");
    expect(links[1]?.getAttribute("rel")).toBe("noopener noreferrer nofollow");
  });
});
