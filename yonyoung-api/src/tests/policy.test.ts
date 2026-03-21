import { describe, expect, it } from "vitest";
import { can, normalizeRole } from "../lib/authorization/policy";

describe("authorization policy", /** describe 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
  it("제거된 user role 문자열은 unverified로 정규화한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(normalizeRole("user")).toBe("unverified");
  });

  it("제거된 member role 문자열은 regular_member로 정규화한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(normalizeRole("member")).toBe("regular_member");
  });

  it("알 수 없는 role은 unverified로 정규화한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(normalizeRole("something-else")).toBe("unverified");
    expect(normalizeRole(null)).toBe("unverified");
  });

  it("회장은 모든 권한을 가진다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(can("president", "generation", "delete")).toBe(true);
    expect(can("president", "user", "update")).toBe(true);
  });

  it("부회장은 활동/전시/링크트리 생성·수정이 가능하고 일부 delete만 제한된다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(can("vice_president", "generation", "delete")).toBe(false);
    expect(can("vice_president", "exhibition", "delete")).toBe(false);
    expect(can("vice_president", "activity", "create")).toBe(true);
    expect(can("vice_president", "activity", "update")).toBe(true);
    expect(can("vice_president", "exhibition", "create")).toBe(true);
    expect(can("vice_president", "exhibition", "update")).toBe(true);
    expect(can("vice_president", "linktree", "create")).toBe(true);
    expect(can("vice_president", "linktree", "update")).toBe(true);
    expect(can("vice_president", "generation", "update")).toBe(true);
  });

  it("부장은 exhibition delete는 불가하고 activity delete는 가능하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(can("manager", "exhibition", "delete")).toBe(false);
    expect(can("manager", "activity", "delete")).toBe(true);
    expect(can("manager", "notice", "create")).toBe(true);
    expect(can("manager", "market", "delete")).toBe(true);
  });

  it("정회원은 user 일반 조회 권한이 없다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(can("regular_member", "user", "read")).toBe(false);
  });

  it("member 계열 role은 동일 권한을 가진다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(can("new_member", "activity", "read")).toBe(true);
    expect(can("new_member", "activity", "create")).toBe(false);
    expect(can("new_member", "activity", "update")).toBe(false);
    expect(can("associate_member", "activity", "create")).toBe(false);
    expect(can("associate_member", "notice", "create")).toBe(false);
    expect(can("regular_member", "notice", "read")).toBe(true);
    expect(can("regular_member", "activity", "update")).toBe(false);
    expect(can("regular_member", "user", "read")).toBe(false);
    expect(can("regular_member", "market", "create")).toBe(true);
    expect(can("regular_member", "market", "delete")).toBe(true);
  });

  it("unverified는 어떤 리소스 권한도 없다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(can("unverified", "generation", "read")).toBe(false);
    expect(can("unverified", "user", "update")).toBe(false);
    expect(can("unverified", "market", "read")).toBe(false);
  });
});
