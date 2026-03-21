export const OPENAPI_BASE_DOCUMENT = {
  openapi: "3.1.1",
  info: {
    title: "Yonyoung API",
    version: "1.0.0",
    description: "Yonyoung 서비스 API 문서",
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey" as const,
        in: "cookie" as const,
        name: "better-auth.session_token",
      },
    },
  },
};

export const OPENAPI_JSON_PATHS = ["/api/openapi.json", "/doc"] as const;
export const OPENAPI_UI_PATHS = ["/api/docs", "/ui"] as const;
