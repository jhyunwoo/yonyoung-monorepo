import { describe, expect, it } from "vitest";
import {
  resolveAuthAllowedHosts,
  resolveCrossSubDomainCookieDomain,
  shouldEnableCrossSubDomainCookies,
} from "../lib/auth";

describe("resolveCrossSubDomainCookieDomain", () => {
  it("workers.dev 서브도메인에서 루트 도메인을 반환한다", () => {
    expect(
      resolveCrossSubDomainCookieDomain("https://api.moveto.workers.dev"),
    ).toBe("moveto.workers.dev");
  });

  it("커스텀 도메인 서브도메인에서 루트 도메인을 반환한다", () => {
    expect(
      resolveCrossSubDomainCookieDomain("https://api.yonyoung.moveto.kr"),
    ).toBe("yonyoung.moveto.kr");
  });

  it("서브도메인이 없으면 undefined를 반환한다", () => {
    expect(
      resolveCrossSubDomainCookieDomain("https://moveto.kr"),
    ).toBeUndefined();
  });

  it("localhost/IP 호스트는 undefined를 반환한다", () => {
    expect(
      resolveCrossSubDomainCookieDomain("http://localhost:8787"),
    ).toBeUndefined();
    expect(
      resolveCrossSubDomainCookieDomain("http://127.0.0.1:8787"),
    ).toBeUndefined();
  });

  it("다중 공개 접미사(ac.kr) 도메인에서 등록 도메인만 남으면 undefined를 반환한다", () => {
    expect(
      resolveCrossSubDomainCookieDomain("https://yonyoung.yonsei.ac.kr"),
    ).toBeUndefined();
  });

  it("다중 공개 접미사(ac.kr) 도메인에서 충분한 깊이가 있으면 쿠키 도메인을 반환한다", () => {
    expect(
      resolveCrossSubDomainCookieDomain("https://sub.yonyoung.yonsei.ac.kr"),
    ).toBe("yonyoung.yonsei.ac.kr");
  });

  it("유효하지 않은 URL은 undefined를 반환한다", () => {
    expect(resolveCrossSubDomainCookieDomain("not-a-url")).toBeUndefined();
  });

  it("trusted origins와 baseURL에서 허용 호스트를 중복 없이 추출한다", () => {
    expect(
      resolveAuthAllowedHosts("https://api.yonyoung.moveto.kr", [
        "https://yonyoung.yonsei.ac.kr",
        "https://api.yonyoung.moveto.kr/",
        "http://localhost:3000",
        "not-a-url",
      ]),
    ).toEqual([
      "api.yonyoung.moveto.kr",
      "yonyoung.yonsei.ac.kr",
      "localhost:3000",
    ]);
  });

  it("모든 trusted origin이 동일 루트 도메인일 때만 cross-subdomain 쿠키를 허용한다", () => {
    expect(
      shouldEnableCrossSubDomainCookies("yonyoung.moveto.kr", [
        "https://api.yonyoung.moveto.kr",
        "https://admin.yonyoung.moveto.kr",
      ]),
    ).toBe(true);
  });

  it("trusted origin에 다른 루트 도메인이 섞이면 cross-subdomain 쿠키를 비활성화한다", () => {
    expect(
      shouldEnableCrossSubDomainCookies("yonyoung.moveto.kr", [
        "https://api.yonyoung.moveto.kr",
        "https://yonyoung.yonsei.ac.kr",
      ]),
    ).toBe(false);
  });
});
