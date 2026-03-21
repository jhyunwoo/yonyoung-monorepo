import { describe, expect, it, vi } from "vitest";
import {
  createD1SequentialSession,
  resolveD1SessionMode,
} from "../lib/db/d1-session";

describe("d1 session wrapper", () => {
  it("세션 모드가 off면 원본 DB를 그대로 반환한다", () => {
    const withSession = vi.fn();
    const db = {
      withSession,
    } as unknown as D1Database;

    const result = createD1SequentialSession(db, {
      mode: "off",
    });

    expect(result.database).toBe(db);
    expect(result.bookmark).toBeNull();
    expect(withSession).not.toHaveBeenCalled();
  });

  it("first-primary 모드면 withSession을 사용하고 bookmark를 노출한다", () => {
    const session = {
      getBookmark: vi.fn(() => "bookmark-1"),
    } as unknown as D1DatabaseSession;
    const withSession = vi.fn(() => session);
    const db = {
      withSession,
    } as unknown as D1Database;

    const result = createD1SequentialSession(db, {
      mode: "first-primary",
    });

    expect(withSession).toHaveBeenCalledWith("first-primary");
    expect(result.database).toBe(session);
    expect(result.bookmark).toBe("bookmark-1");
  });

  it("bookmark가 있으면 bookmark로 세션을 생성한다", () => {
    const session = {
      getBookmark: vi.fn(() => "bookmark-next"),
    } as unknown as D1DatabaseSession;
    const withSession = vi.fn(() => session);
    const db = {
      withSession,
    } as unknown as D1Database;

    const result = createD1SequentialSession(db, {
      mode: "first-unconstrained",
      bookmark: "bookmark-prev",
    });

    expect(withSession).toHaveBeenCalledWith("bookmark-prev");
    expect(result.database).toBe(session);
    expect(result.bookmark).toBe("bookmark-next");
  });

  it("withSession 호출이 실패하면 off 모드로 안전하게 폴백한다", () => {
    const withSession = vi.fn(() => {
      throw new Error("withSession unsupported");
    });
    const db = {
      withSession,
    } as unknown as D1Database;

    const result = createD1SequentialSession(db, {
      mode: "first-primary",
    });

    expect(withSession).toHaveBeenCalledWith("first-primary");
    expect(result.mode).toBe("off");
    expect(result.database).toBe(db);
    expect(result.bookmark).toBeNull();
  });

  it("환경값에서 세션 모드를 파싱한다", () => {
    expect(resolveD1SessionMode("first-primary")).toBe("first-primary");
    expect(resolveD1SessionMode("first-unconstrained")).toBe(
      "first-unconstrained",
    );
    expect(resolveD1SessionMode("off")).toBe("off");
    expect(resolveD1SessionMode("unexpected")).toBe("off");
    expect(resolveD1SessionMode(undefined)).toBe("off");
  });
});
