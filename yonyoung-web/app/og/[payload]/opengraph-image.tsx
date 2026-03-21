import { headers } from "next/headers";
import { ImageResponse } from "next/og";
import {
  decodeOpenGraphImagePayload,
  DEFAULT_OPEN_GRAPH_IMAGE_PAYLOAD,
} from "@/features/seo/og/opengraph-image";
import { resolveSiteUrl } from "@/features/seo/metadata/seo";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";
export const alt = "연영회 페이지 미리보기 이미지";
export const revalidate = 86_400;

type OpenGraphImageProps = {
  params: Promise<{
    payload: string;
  }>;
};

const FONT_REGULAR_URL =
  "https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Regular.otf";
const FONT_BOLD_URL = "https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Bold.otf";
const LOGO_PATH = "/yonyoung-logo-black.png";
const PAGE_INFO_LABEL = "페이지 정보";

const truncateText = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
};

const loadFont = async (url: string): Promise<ArrayBuffer | null> => {
  try {
    const response = await fetch(url, {
      cache: "force-cache",
    });

    if (!response.ok) {
      return null;
    }

    return await response.arrayBuffer();
  } catch {
    return null;
  }
};

const regularFontPromise = loadFont(FONT_REGULAR_URL);
const boldFontPromise = loadFont(FONT_BOLD_URL);

const getKoreanFonts = async () => {
  const [regularFont, boldFont] = await Promise.all([
    regularFontPromise,
    boldFontPromise,
  ]);
  const fonts: Array<{
    name: string;
    data: ArrayBuffer;
    style: "normal";
    weight: 400 | 700;
  }> = [];

  if (regularFont) {
    fonts.push({
      name: "Noto Sans KR",
      data: regularFont,
      style: "normal",
      weight: 400,
    });
  }

  if (boldFont) {
    fonts.push({
      name: "Noto Sans KR",
      data: boldFont,
      style: "normal",
      weight: 700,
    });
  }

  return fonts;
};

const resolveRequestOrigin = async (): Promise<string> => {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) {
    return resolveSiteUrl();
  }

  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
};

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const { payload } = await params;
  const parsedPayload =
    decodeOpenGraphImagePayload(payload) ?? DEFAULT_OPEN_GRAPH_IMAGE_PAYLOAD;

  const title = truncateText(parsedPayload.title, 42);
  const description = truncateText(parsedPayload.description, 96);
  const path = truncateText(parsedPayload.path, 56);
  const requestOrigin = await resolveRequestOrigin();
  const logoUrl = new URL(LOGO_PATH, requestOrigin).toString();
  const fonts = await getKoreanFonts();

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "54px 64px",
        background: "linear-gradient(135deg, #f3f6ff 0%, #ffffff 45%, #eaf0ff 100%)",
        color: "#26356a",
        fontFamily: "Noto Sans KR",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "90px",
            height: "90px",
            borderRadius: "20px",
            border: "1px solid #c9d5f6",
            background: "#ffffff",
          }}
        >
          <img
            src={logoUrl}
            alt="연영회 로고"
            width="60"
            height="60"
            style={{
              objectFit: "contain",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span
            style={{
              fontSize: "42px",
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}
          >
            연영회
          </span>
          <span
            style={{
              fontSize: "22px",
              color: "#445893",
            }}
          >
            연세대학교 중앙사진동아리
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          maxWidth: "100%",
        }}
      >
        <span
          style={{
            fontSize: "62px",
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.025em",
            maxWidth: "95%",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: "30px",
            lineHeight: 1.45,
            color: "#3b4d84",
            maxWidth: "96%",
          }}
        >
          {description}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "22px",
          color: "#546796",
        }}
      >
        <span
          style={{
            fontWeight: 700,
          }}
        >
          {PAGE_INFO_LABEL}
        </span>
        <span>{path}</span>
      </div>
    </div>,
    {
      ...size,
      ...(fonts.length > 0 ? { fonts } : {}),
    },
  );
}
