const DEFAULT_SITE_NAME = "연영회";
const DEFAULT_PAGE_DESCRIPTION = "연세대학교 중앙사진동아리 연영회";
const MAX_TITLE_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 180;
const MAX_PATH_LENGTH = 120;

type OpenGraphImagePayload = {
  title: string;
  description: string;
  path: string;
};

export const DEFAULT_OPEN_GRAPH_IMAGE_PAYLOAD: OpenGraphImagePayload = {
  title: DEFAULT_SITE_NAME,
  description: DEFAULT_PAGE_DESCRIPTION,
  path: "/",
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const truncateText = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
};

const normalizeText = (value: unknown, fallback: string, maxLength: number): string => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return fallback;
  }

  return truncateText(trimmed, maxLength);
};

const normalizePath = (value: unknown): string => {
  if (typeof value !== "string") {
    return DEFAULT_OPEN_GRAPH_IMAGE_PAYLOAD.path;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return DEFAULT_OPEN_GRAPH_IMAGE_PAYLOAD.path;
  }

  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return truncateText(normalized, MAX_PATH_LENGTH);
};

const toBase64Url = (value: string): string => {
  const bytes = textEncoder.encode(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
};

const fromBase64Url = (value: string): string => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized.padEnd(normalized.length + paddingLength, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return textDecoder.decode(bytes);
};

export const normalizeOpenGraphImagePayload = (
  value: Partial<OpenGraphImagePayload>,
): OpenGraphImagePayload => {
  return {
    title: normalizeText(
      value.title,
      DEFAULT_OPEN_GRAPH_IMAGE_PAYLOAD.title,
      MAX_TITLE_LENGTH,
    ),
    description: normalizeText(
      value.description,
      DEFAULT_OPEN_GRAPH_IMAGE_PAYLOAD.description,
      MAX_DESCRIPTION_LENGTH,
    ),
    path: normalizePath(value.path),
  };
};

export const encodeOpenGraphImagePayload = (
  value: Partial<OpenGraphImagePayload>,
): string => {
  const normalized = normalizeOpenGraphImagePayload(value);
  return toBase64Url(JSON.stringify(normalized));
};

export const decodeOpenGraphImagePayload = (
  encodedValue: string,
): OpenGraphImagePayload | null => {
  try {
    const parsedValue = JSON.parse(
      fromBase64Url(encodedValue),
    ) as Partial<OpenGraphImagePayload>;

    return normalizeOpenGraphImagePayload(parsedValue);
  } catch {
    return null;
  }
};

export const buildOpenGraphImagePath = (
  value: Partial<OpenGraphImagePayload>,
): string => {
  const encodedPayload = encodeOpenGraphImagePayload(value);
  return `/og/${encodedPayload}/opengraph-image`;
};
