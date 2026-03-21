import { FilterXSS } from "xss";

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

const LINK_PROTOCOL_PREFIXES = ["http://", "https://", "mailto:"] as const;

const trim = (value: string): string => value.trim();

const isAllowedLink = (value: string): boolean => {
  const normalized = trim(value).toLowerCase();
  return LINK_PROTOCOL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
};

const readPositiveNumberAttribute = (value: string): string => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "";
  }

  return String(parsed);
};

const buildWhiteList = (): Record<string, string[]> => {
  return Object.fromEntries(
    ALLOWED_TAGS.map((tag) => [tag, [...(ALLOWED_ATTRS[tag as keyof typeof ALLOWED_ATTRS] ?? [])]]),
  );
};

const sanitizeFilter = new FilterXSS({
  whiteList: buildWhiteList(),
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

const normalizeWhitespace = (value: string): string =>
  value.replace(/\u00a0|&#160;|&nbsp;/gi, " ").replace(/\s+/g, " ").trim();

export const sanitizeRichTextHtml = (rawHtml: string): string => {
  return sanitizeFilter.process(rawHtml);
};

export const stripRichTextHtmlToText = (rawHtml: string): string => {
  const sanitized = sanitizeRichTextHtml(rawHtml);
  return normalizeWhitespace(sanitized.replace(/<[^>]*>/g, " "));
};

export const hasMeaningfulRichTextHtml = (rawHtml: string): boolean => {
  return stripRichTextHtmlToText(rawHtml).length > 0;
};
