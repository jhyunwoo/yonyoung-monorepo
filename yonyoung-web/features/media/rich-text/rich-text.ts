import { FilterXSS } from "xss";

const RICH_TEXT_TAG_PATTERN = /<[^>]*>/g;
const NON_BREAKING_SPACE_PATTERN = /(?:\u00a0|&nbsp;|&#160;)/gi;
const MULTI_WHITESPACE_PATTERN = /\s+/g;
const ALLOWED_TAGS = [
  "h2",
  "h3",
  "p",
  "br",
  "strong",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "a",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
] as const;
const ALLOWED_ATTRS = {
  a: ["href", "target", "rel"],
  th: ["colspan", "rowspan"],
  td: ["colspan", "rowspan"],
} as const;
const ALLOWED_LINK_PREFIXES = ["http://", "https://", "mailto:"] as const;

const trim = (value: string): string => value.trim();

const normalizeWhitespace = (value: string): string => {
  return value
    .replace(NON_BREAKING_SPACE_PATTERN, " ")
    .replace(MULTI_WHITESPACE_PATTERN, " ")
    .trim();
};

const isAllowedLink = (value: string): boolean => {
  const normalized = trim(value).toLowerCase();
  return ALLOWED_LINK_PREFIXES.some((prefix) => normalized.startsWith(prefix));
};

const readPositiveNumberAttribute = (value: string): string => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "";
  }

  return String(parsed);
};

const sanitizeFilter = new FilterXSS({
  whiteList: Object.fromEntries(
    ALLOWED_TAGS.map((tag) => [tag, [...(ALLOWED_ATTRS[tag as keyof typeof ALLOWED_ATTRS] ?? [])]]),
  ),
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style", "iframe", "object", "embed"],
  css: false,
  safeAttrValue(tag, name, value) {
    if (tag === "a" && name === "href") {
      return isAllowedLink(value) ? trim(value) : "";
    }

    if (tag === "a" && name === "target") {
      return value === "_blank" ? "_blank" : "";
    }

    if (tag === "a" && name === "rel") {
      return "noopener noreferrer nofollow";
    }

    if ((tag === "th" || tag === "td") && (name === "colspan" || name === "rowspan")) {
      return readPositiveNumberAttribute(value);
    }

    return "";
  },
});

const ensureSafeLinkRel = (html: string): string => {
  return html.replace(/<a\b([^>]*?)>/gi, (fullMatch, attributes: string) => {
    if (!/\bhref\s*=/i.test(attributes)) {
      return fullMatch;
    }

    if (/\brel\s*=/i.test(attributes)) {
      return fullMatch.replace(
        /\brel\s*=\s*(['"]).*?\1/i,
        'rel="noopener noreferrer nofollow"',
      );
    }

    return `<a${attributes} rel="noopener noreferrer nofollow">`;
  });
};

export const sanitizeRichTextHtml = (html: string): string => {
  return ensureSafeLinkRel(sanitizeFilter.process(html));
};

const stripRichTextHtml = (html: string): string => {
  return normalizeWhitespace(sanitizeRichTextHtml(html).replace(RICH_TEXT_TAG_PATTERN, " "));
};

export const hasMeaningfulRichTextHtml = (html: string): boolean => {
  return stripRichTextHtml(html).length > 0;
};

export const summarizeRichTextHtml = (html: string, maxLength = 120): string => {
  const text = stripRichTextHtml(html);
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
};
