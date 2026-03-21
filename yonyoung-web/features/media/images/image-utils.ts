/**
 * 사용자 입력 기반 원격 이미지 URL은 Next 이미지 최적화(fetch) 단계에서
 * 런타임 TLS 환경 이슈를 유발할 수 있어 브라우저 직접 로드를 사용한다.
 */
export const shouldUseUnoptimizedImage = (src: string): boolean => {
  if (!src) {
    return false;
  }

  try {
    const protocol = new URL(src).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
};
