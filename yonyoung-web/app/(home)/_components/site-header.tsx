"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";

type NavChild = {
  href: string;
  label: string;
};

type NavItem = {
  href: string;
  label: string;
  testId: string;
  children?: NavChild[];
};

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const navItems: NavItem[] = [
  {
    href: "/about",
    label: "ABOUT",
    testId: "about",
    children: [
      { href: "/about", label: "소개" },
      { href: "/about/photographers", label: "PHOTOGRAPHERS" },
      { href: "/about/recruiting", label: "RECRUITING" },
    ],
  },
  {
    href: "/archive",
    label: "ARCHIVE",
    testId: "archive",
    children: [
      { href: "/archive/records", label: "활동 기록" },
      { href: "/archive/exhibitions", label: "전시회" },
    ],
  },
  { href: "/linktree", label: "LINKTREE", testId: "linktree" },
  { href: "/donate", label: "DONATE US", testId: "donate" },
];

const isActivePath = (pathname: string, item: NavItem): boolean => {
  if (item.href === "/about") {
    return pathname.startsWith("/about");
  }
  if (item.href === "/archive") {
    return pathname.startsWith("/archive");
  }
  return pathname === item.href;
};

const desktopLinkBaseClass =
  "relative block py-6 text-[0.9rem] font-medium tracking-[0.05em] text-(--text-primary) uppercase after:absolute after:bottom-[0.8rem] after:left-0 after:h-[2px] after:w-0 after:bg-(--text-primary) after:transition-[width] after:duration-300 hover:after:w-full";

const mobileLinkBaseClass =
  "relative block px-4 py-4 text-center text-[0.9rem] font-medium tracking-[0.05em] text-(--text-primary) uppercase after:absolute after:bottom-[0.6rem] after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:bg-(--text-primary) after:transition-[width] after:duration-300 hover:after:w-12";

const resolveTheme = (mode: ThemeMode, isSystemDark: boolean): ResolvedTheme => {
  if (mode === "system") {
    return isSystemDark ? "dark" : "light";
  }
  return mode;
};

const readStoredThemeMode = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // ignore storage errors
  }

  const datasetMode = document.documentElement.dataset.themeMode;
  if (datasetMode === "light" || datasetMode === "dark" || datasetMode === "system") {
    return datasetMode;
  }

  return "system";
};

const readResolvedThemeFromDataset = (): ResolvedTheme | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const datasetTheme = document.documentElement.dataset.theme;
  if (datasetTheme === "light" || datasetTheme === "dark") {
    return datasetTheme;
  }

  return null;
};

export default function SiteHeader() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [isSystemDark, setIsSystemDark] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const initialMode = readStoredThemeMode();
    setThemeMode(initialMode);

    const datasetTheme = readResolvedThemeFromDataset();
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsSystemDark(systemDark);
    const nextResolvedTheme = datasetTheme ?? resolveTheme(initialMode, systemDark);
    document.documentElement.classList.toggle("dark", nextResolvedTheme === "dark");
    document.documentElement.dataset.theme = nextResolvedTheme;
    document.documentElement.dataset.themeMode = initialMode;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => {
      setIsSystemDark(mediaQuery.matches);
      if (themeMode !== "system") {
        return;
      }
      const nextResolvedTheme = resolveTheme("system", mediaQuery.matches);
      document.documentElement.classList.toggle("dark", nextResolvedTheme === "dark");
      document.documentElement.dataset.theme = nextResolvedTheme;
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onSystemThemeChange);
      return () => mediaQuery.removeEventListener("change", onSystemThemeChange);
    }

    mediaQuery.addListener(onSystemThemeChange);
    return () => mediaQuery.removeListener(onSystemThemeChange);
  }, [themeMode]);

  const handleThemeModeChange = (nextMode: ThemeMode) => {
    setThemeMode(nextMode);

    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextResolvedTheme = resolveTheme(nextMode, systemDark);
    document.documentElement.classList.toggle("dark", nextResolvedTheme === "dark");
    document.documentElement.dataset.theme = nextResolvedTheme;
    document.documentElement.dataset.themeMode = nextMode;

    try {
      localStorage.setItem("theme", nextMode);
    } catch {
      // ignore storage errors
    }
  };

  const logoSrc =
    resolveTheme(themeMode, isSystemDark) === "dark"
      ? "/yonyong-logo-white.png"
      : "/yonyoung-logo-black.png";

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-[1000] h-[var(--public-header-height-mobile)] border-b border-transparent bg-(--surface-elevated) transition-all duration-300 md:h-[var(--public-header-height-desktop)]",
        isScrolled
          ? "border-b-(--surface-border) shadow-[0_2px_10px_var(--shadow-strong)]"
          : "",
      ]
        .join(" ")
        .trim()}
      data-testid="public-header"
    >
      <div className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-[0.6rem]"
            data-testid="public-logo-link"
          >
            <div className="flex h-[1.92rem] items-center justify-center">
              <Image
                key={logoSrc}
                src={logoSrc}
                alt="연영회 로고"
                width={40}
                height={40}
                priority
                unoptimized
                className="h-full w-auto object-contain"
                data-testid="public-logo-image"
              />
            </div>
            <div className="text-left text-[0.8rem] leading-[1.2] font-bold tracking-[-0.02em] text-(--text-primary)">
              <span className="block tracking-[-0.05em]">연세대학교 중앙사진동아리</span>
              연영회
            </div>
          </Link>
        </div>

        <nav
          className="hidden items-center gap-3 md:flex"
          data-testid="public-nav-desktop"
        >
          <ul className="flex list-none items-center gap-8">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item);
              return (
                <li
                  key={item.href}
                  className={item.children ? "relative group" : "relative"}
                >
                  <Link
                    href={item.href}
                    className={`${desktopLinkBaseClass} ${active ? "after:w-full" : ""}`.trim()}
                    data-testid={`public-nav-desktop-${item.testId}`}
                  >
                    {item.label}
                  </Link>
                  {item.children ? (
                    <ul className="invisible absolute top-full left-1/2 z-20 min-w-[150px] -translate-x-1/2 border-t-2 border-(--surface-strong-border) bg-(--surface-elevated) py-2 opacity-0 shadow-[0_4px_15px_var(--shadow-strong)] transition-all duration-300 group-hover:visible group-hover:opacity-100">
                      {item.children.map((child) => (
                        <li key={child.href} className="w-full">
                          <Link
                            href={child.href}
                            className="block whitespace-nowrap px-6 py-[0.8rem] text-[0.85rem] text-(--text-primary) transition-colors duration-200 hover:bg-(--surface-muted)"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <div
            className="flex items-center gap-1 rounded-full border border-(--surface-border) bg-(--surface-elevated) p-1"
            role="group"
            aria-label="테마 모드 선택"
            data-testid="public-theme-mode-group"
          >
            <button
              type="button"
              onClick={() => handleThemeModeChange("light")}
              aria-label="라이트 모드"
              aria-pressed={themeMode === "light"}
              data-testid="public-theme-mode-light"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
                themeMode === "light"
                  ? "bg-(--accent) text-(--accent-foreground)"
                  : "text-(--text-primary) hover:bg-(--surface-muted)"
              }`}
            >
              <Sun className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => handleThemeModeChange("dark")}
              aria-label="다크 모드"
              aria-pressed={themeMode === "dark"}
              data-testid="public-theme-mode-dark"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
                themeMode === "dark"
                  ? "bg-(--accent) text-(--accent-foreground)"
                  : "text-(--text-primary) hover:bg-(--surface-muted)"
              }`}
            >
              <Moon className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => handleThemeModeChange("system")}
              aria-label="기기 설정"
              aria-pressed={themeMode === "system"}
              data-testid="public-theme-mode-system"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
                themeMode === "system"
                  ? "bg-(--accent) text-(--accent-foreground)"
                  : "text-(--text-primary) hover:bg-(--surface-muted)"
              }`}
            >
              <Monitor className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </nav>

        <button
          type="button"
          className="flex h-11 w-11 flex-col items-center justify-center gap-[5px] rounded p-0 md:hidden"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label="모바일 메뉴 토글"
          aria-expanded={isMobileMenuOpen}
          data-testid="public-nav-toggle"
        >
          <span
            className={`h-[2px] w-[25px] bg-(--text-primary) transition-all duration-300 ${
              isMobileMenuOpen ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span
            className={`h-[2px] w-[25px] bg-(--text-primary) transition-all duration-300 ${
              isMobileMenuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`h-[2px] w-[25px] bg-(--text-primary) transition-all duration-300 ${
              isMobileMenuOpen ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isMobileMenuOpen ? (
          <div className="fixed inset-x-0 top-[var(--public-header-height-mobile)] bottom-0 z-[999] md:top-[var(--public-header-height-desktop)] md:hidden">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/25"
              aria-label="모바일 메뉴 닫기"
              data-testid="public-nav-mobile-backdrop"
              onClick={() => setIsMobileMenuOpen(false)}
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, transition: { duration: 0.18, ease: "easeOut" } }
              }
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
            />
            <motion.nav
              className="absolute inset-x-0 top-0 block border-b border-(--surface-border) bg-(--surface-elevated) p-8"
              data-testid="public-nav-mobile"
              data-state="open"
              initial={shouldReduceMotion ? false : { opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0, y: -8 }
                  : { opacity: 0, y: -20, transition: { duration: 0.2, ease: "easeOut" } }
              }
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 360, damping: 30, mass: 0.62 }
              }
            >
              <ul className="flex list-none flex-col gap-4">
                {navItems.map((item) => {
                  const active = isActivePath(pathname, item);
                  return (
                    <li key={item.href} className="w-full">
                      <Link
                        href={item.href}
                        className={`${mobileLinkBaseClass} ${active ? "after:w-12" : ""}`.trim()}
                        data-testid={`public-nav-mobile-${item.testId}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                      {item.children ? (
                        <ul className="mt-[0.4rem] w-full list-none bg-(--surface-muted)">
                          {item.children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className="block px-4 py-[0.8rem] text-center text-[0.8rem] text-(--text-primary)"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </motion.nav>
          </div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
