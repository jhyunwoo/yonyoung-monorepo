import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ImgHTMLAttributes } from "react";

afterEach(() => {
  cleanup();
});

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => createElement("img", props),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    createElement("a", { ...props, href }, children),
}));

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

if (
  typeof window !== "undefined" &&
  (typeof window.localStorage === "undefined" ||
    typeof window.localStorage.clear !== "function")
) {
  const storage = (() => {
    const entries = new Map<string, string>();

    return {
      get length() {
        return entries.size;
      },
      clear: () => {
        entries.clear();
      },
      getItem: (key: string) => {
        return entries.get(String(key)) ?? null;
      },
      key: (index: number) => {
        return [...entries.keys()][index] ?? null;
      },
      removeItem: (key: string) => {
        entries.delete(String(key));
      },
      setItem: (key: string, value: string) => {
        entries.set(String(key), String(value));
      },
    } satisfies Storage;
  })();

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
}
