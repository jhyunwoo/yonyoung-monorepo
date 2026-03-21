"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  ChevronDown,
  FolderKanban,
  House,
  Image as ImageIcon,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  Store,
  UserCircle2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/features/auth/client/auth-actions";
import { isPresidentOrVicePresidentRole } from "@/features/auth/model/auth-shared";
import { buildDashboardSettingsMenuItems } from "@/features/dashboard/settings/dashboard-settings-menu";
import type { DashboardGenerationOption } from "@/features/dashboard/generation/generation-options";
import { isSameGenerationRouteName } from "@/features/dashboard/generation/dashboard-generation-route";
import { isMemberLikeRoleValue } from "@/shared/contracts/auth-roles";

export type DashboardViewer = {
  id: string;
  displayName: string;
  email: string;
  image: string | null;
  role: string | null;
};

type DashboardShellProps = {
  children: ReactNode;
  generationOptions: DashboardGenerationOption[];
  viewer: DashboardViewer | null;
};

type NavigationItem = {
  key: string;
  href: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
};

const SidebarContent = (input: {
  pathname: string;
  generationOptions: DashboardGenerationOption[];
  selectedGeneration: DashboardGenerationOption | null;
  selectedGenerationScopedPath: string | null;
  viewer: DashboardViewer | null;
  onNavigate: () => void;
  onSignOut: () => Promise<void>;
  isSignOutPending: boolean;
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const settingsSubItems = buildDashboardSettingsMenuItems({
    canManagePrivilegedSettings: isPresidentOrVicePresidentRole(input.viewer?.role),
    isMemberLikeRole: isMemberLikeRoleValue(input.viewer?.role),
  });
  const isSettingsSectionActive =
    input.pathname === "/dashboard/profile" ||
    input.pathname.startsWith("/dashboard/profile/") ||
    input.pathname === "/dashboard/settings" ||
    input.pathname.startsWith("/dashboard/settings/");
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(isSettingsSectionActive);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [input.pathname]);

  useEffect(() => {
    if (isSettingsSectionActive) {
      setIsSettingsExpanded(true);
    }
  }, [isSettingsSectionActive]);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (profileMenuRef.current?.contains(target)) {
        return;
      }

      setIsProfileMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileMenuOpen]);

  const navigationItems: NavigationItem[] = input.selectedGeneration
    ? [
        {
          key: "dashboard-home",
          href: "/dashboard",
          label: "전체 기수",
          Icon: ArrowLeft,
          active: input.pathname === "/dashboard",
        },
        {
          key: "generation-home",
          href: input.selectedGeneration.path,
          label: "기수 홈",
          Icon: FolderKanban,
          active: input.selectedGenerationScopedPath === "/",
        },
        {
          key: "generation-notices",
          href: `${input.selectedGeneration.path}/notices`,
          label: "공지",
          Icon: Megaphone,
          active: input.selectedGenerationScopedPath?.startsWith("/notices") === true,
        },
        {
          key: "generation-activities",
          href: `${input.selectedGeneration.path}/activities`,
          label: "활동",
          Icon: ImageIcon,
          active: input.selectedGenerationScopedPath?.startsWith("/activities") === true,
        },
        {
          key: "generation-exhibitions",
          href: `${input.selectedGeneration.path}/exhibitions`,
          label: "전시",
          Icon: Camera,
          active: input.selectedGenerationScopedPath?.startsWith("/exhibitions") === true,
        },
        {
          key: "generation-members",
          href: `${input.selectedGeneration.path}/members`,
          label: "기수 멤버",
          Icon: Users,
          active: input.selectedGenerationScopedPath?.startsWith("/members") === true,
        },
        {
          key: "market",
          href: "/dashboard/market",
          label: "연영장터",
          Icon: Store,
          active:
            input.pathname === "/dashboard/market" ||
            input.pathname.startsWith("/dashboard/market/"),
        },
        {
          key: "homepage",
          href: "/",
          label: "홈페이지",
          Icon: House,
          active: input.pathname === "/",
        },
      ]
    : [
        ...input.generationOptions.map((generation) => ({
          key: `generation-${generation.id}`,
          href: generation.path,
          label: generation.name,
          Icon: FolderKanban,
          active:
            input.pathname === generation.path ||
            input.pathname.startsWith(`${generation.path}/`),
        })),
        {
          key: "market",
          href: "/dashboard/market",
          label: "연영장터",
          Icon: Store,
          active:
            input.pathname === "/dashboard/market" ||
            input.pathname.startsWith("/dashboard/market/"),
        },
        {
          key: "homepage",
          href: "/",
          label: "홈페이지",
          Icon: House,
          active: input.pathname === "/",
        },
      ];

  const currentGeneration = input.selectedGeneration;

  const viewerName = input.viewer?.displayName ?? "사용자";
  const viewerEmail = input.viewer?.email ?? "";
  const viewerImage = input.viewer?.image;
  const avatarFallback = viewerName.slice(0, 1);

  const handleProfileLinkClick = () => {
    setIsProfileMenuOpen(false);
    input.onNavigate();
  };

  const handleSignOutClick = async () => {
    if (input.isSignOutPending) {
      return;
    }

    setIsProfileMenuOpen(false);
    await input.onSignOut();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-5">
        <Link
          href="/dashboard"
          onClick={input.onNavigate}
          className="flex items-center gap-3"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <Image
              src="/yonyoung-logo-black.png"
              alt="연영회 로고"
              width={32}
              height={32}
              unoptimized
              className="h-8 w-8 object-contain"
            />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900 dark:text-slate-50">연영회 대시보드</p>
            {currentGeneration ? (
              <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                현재 기수: {currentGeneration.name}
              </p>
            ) : null}
          </div>
        </Link>

        {!currentGeneration && input.generationOptions.length === 0 ? (
          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            현재 소속된 기수 정보가 없습니다.
          </p>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          <AnimatePresence initial={false} mode="popLayout">
            {navigationItems.map(({ key, href, label, Icon, active }) => (
              <motion.li
                key={key}
                layout={!shouldReduceMotion}
                initial={shouldReduceMotion ? false : { opacity: 0, x: -12, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: 12, scale: 0.98, transition: { duration: 0.14 } }
                }
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 520, damping: 34, mass: 0.64 }
                }
              >
                <Link
                  href={href}
                  onClick={input.onNavigate}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>

          <motion.li layout={!shouldReduceMotion}>
            <button
              type="button"
              data-testid="dashboard-settings-toggle"
              onClick={() => setIsSettingsExpanded((previous) => !previous)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                isSettingsSectionActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50"
              }`}
              aria-expanded={isSettingsExpanded}
            >
              <Settings className="h-4 w-4" />
              <span className="flex-1">설정</span>
              <ChevronDown
                className={`h-4 w-4 transition ${isSettingsExpanded ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence initial={false}>
              {isSettingsExpanded ? (
                <motion.ul
                  initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={
                    shouldReduceMotion
                      ? { height: 0, opacity: 0 }
                      : { height: 0, opacity: 0, transition: { duration: 0.16 } }
                  }
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 460, damping: 36, mass: 0.58 }
                  }
                  className="mt-1 space-y-1 overflow-hidden pl-9"
                >
                  {settingsSubItems.map((settingsSubItem, index) => {
                    const isSubItemActive =
                      input.pathname === settingsSubItem.href ||
                      input.pathname.startsWith(`${settingsSubItem.href}/`);

                    return (
                      <motion.li
                        key={settingsSubItem.key}
                        initial={shouldReduceMotion ? false : { opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={
                          shouldReduceMotion
                            ? { opacity: 0 }
                            : { opacity: 0, x: 8, transition: { duration: 0.12 } }
                        }
                        transition={
                          shouldReduceMotion
                            ? { duration: 0 }
                            : { duration: 0.2, delay: index * 0.03, ease: "easeOut" }
                        }
                      >
                        <Link
                          href={settingsSubItem.href}
                          onClick={input.onNavigate}
                          className={`block rounded-lg px-3 py-2 text-sm transition ${
                            isSubItemActive
                              ? "bg-slate-100 dark:bg-slate-700 font-semibold text-slate-900 dark:text-slate-50"
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50"
                          }`}
                        >
                          {settingsSubItem.label}
                        </Link>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              ) : null}
            </AnimatePresence>
          </motion.li>
        </ul>
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-700 p-3">
        <div className="relative" ref={profileMenuRef}>
          <AnimatePresence initial={false}>
            {isProfileMenuOpen ? (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.14 } }
                }
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 520, damping: 34, mass: 0.64 }
                }
                className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg"
              >
                <Link
                  href="/dashboard/profile"
                  onClick={handleProfileLinkClick}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <UserCircle2 className="h-4 w-4" />
                  <span>개인 프로필</span>
                </Link>
                <button
                  type="button"
                  data-testid="dashboard-signout-button"
                  onClick={handleSignOutClick}
                  disabled={input.isSignOutPending}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{input.isSignOutPending ? "로그아웃 중..." : "로그아웃"}</span>
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <button
            type="button"
            data-testid="dashboard-profile-menu-toggle"
            onClick={() => setIsProfileMenuOpen((previous) => !previous)}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-left transition hover:bg-slate-50"
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
          >
            <div className="h-9 w-9 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700">
              {viewerImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewerImage}
                  alt="사용자 프로필 이미지"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {avatarFallback}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                {viewerName}
              </p>
              {viewerEmail ? (
                <p className="truncate text-xs text-slate-600 dark:text-slate-300">{viewerEmail}</p>
              ) : null}
            </div>

            <ChevronDown
              className={`h-4 w-4 text-slate-600 dark:text-slate-300 transition ${
                isProfileMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

const resolveActiveGenerationFromPath = (
  pathname: string,
  generationOptions: DashboardGenerationOption[],
): DashboardGenerationOption | null => {
  if (!pathname.startsWith("/dashboard/")) {
    return null;
  }

  const nextPathname = pathname.slice("/dashboard/".length);
  const routeName = nextPathname.split("/")[0];
  if (
    !routeName ||
    routeName === "settings" ||
    routeName === "profile" ||
    routeName === "market"
  ) {
    return null;
  }

  return (
    generationOptions.find((generation) =>
      isSameGenerationRouteName(generation.name, routeName),
    ) ?? null
  );
};

const resolveSelectedGenerationScopedPath = (pathname: string): string | null => {
  const segments = pathname.split("/").filter((segment) => segment.length > 0);
  if (segments.length < 2 || segments[0] !== "dashboard") {
    return null;
  }

  const routeName = segments[1];
  if (
    !routeName ||
    routeName === "settings" ||
    routeName === "profile" ||
    routeName === "market"
  ) {
    return null;
  }

  if (segments.length === 2) {
    return "/";
  }

  return `/${segments.slice(2).join("/")}`;
};

export default function DashboardShell({
  children,
  generationOptions,
  viewer,
}: DashboardShellProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSignOutPending, setIsSignOutPending] = useState(false);

  const isAuthRoute = pathname.startsWith("/auth/");

  const selectedGeneration = useMemo(
    () => resolveActiveGenerationFromPath(pathname, generationOptions),
    [pathname, generationOptions],
  );
  const selectedGenerationScopedPath = useMemo(
    () => resolveSelectedGenerationScopedPath(pathname),
    [pathname],
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const activePageName = useMemo(() => {
    if (pathname === "/dashboard") {
      return "홈";
    }

    if (pathname.startsWith("/dashboard/profile")) {
      return "내 프로필";
    }

    if (pathname.startsWith("/dashboard/settings")) {
      return "설정";
    }

    if (pathname.startsWith("/dashboard/market")) {
      return "연영장터";
    }

    if (selectedGeneration) {
      if (selectedGenerationScopedPath === "/") {
        const generationName = selectedGeneration.name.trim();
        return generationName.length > 0 ? generationName : "기수 홈";
      }
      if (selectedGenerationScopedPath?.startsWith("/notices")) {
        return "공지";
      }
      if (selectedGenerationScopedPath?.startsWith("/exhibitions")) {
        return "전시";
      }
      if (selectedGenerationScopedPath?.startsWith("/members")) {
        return "기수 멤버";
      }
      if (selectedGenerationScopedPath?.startsWith("/activities")) {
        return "활동";
      }

      return selectedGeneration.name;
    }

    return "Dashboard";
  }, [pathname, selectedGeneration, selectedGenerationScopedPath]);

  const handleSignOut = async () => {
    if (isSignOutPending) {
      return;
    }

    setIsSignOutPending(true);
    const result = await signOut();

    setIsSignOutPending(false);
    if (!result.ok) {
      return;
    }

    window.location.href = "/auth/sign-in";
  };

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 md:block">
        <SidebarContent
          pathname={pathname}
          generationOptions={generationOptions}
          selectedGeneration={selectedGeneration}
          selectedGenerationScopedPath={selectedGenerationScopedPath}
          viewer={viewer}
          onNavigate={() => {}}
          onSignOut={handleSignOut}
          isSignOutPending={isSignOutPending}
        />
      </aside>

      <div className="md:pl-72">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/95 px-4 py-3 backdrop-blur md:hidden">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{activePageName}</p>
          <button
            type="button"
            data-testid="dashboard-mobile-sidebar-open"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="사이드바 열기"
          >
            <Menu className="h-4 w-4" />
          </button>
        </header>

        <main>{children}</main>
      </div>

      <AnimatePresence initial={false}>
        {mobileOpen ? (
          <div
            className="fixed inset-0 z-40 md:hidden"
            role="dialog"
            aria-modal="true"
            data-testid="dashboard-mobile-sidebar"
            data-state="open"
          >
            <motion.button
              type="button"
              data-testid="dashboard-mobile-sidebar-backdrop"
              aria-label="사이드바 닫기"
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => setMobileOpen(false)}
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, transition: { duration: 0.2, ease: "easeOut" } }
              }
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
            />
            <motion.aside
              className="absolute right-0 top-0 flex h-full w-[84%] max-w-sm flex-col border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
              initial={shouldReduceMotion ? false : { x: "100%", opacity: 0.98 }}
              animate={{ x: 0, opacity: 1 }}
              exit={
                shouldReduceMotion
                  ? { x: "100%", opacity: 0.98 }
                  : {
                      x: "100%",
                      opacity: 0.98,
                      transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] },
                    }
              }
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 330, damping: 32, mass: 0.7 }
              }
            >
              <div className="flex items-center justify-end border-b border-slate-200 dark:border-slate-700 px-4 py-3">
                <button
                  type="button"
                  data-testid="dashboard-mobile-sidebar-close"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="사이드바 닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1">
                <SidebarContent
                  pathname={pathname}
                  generationOptions={generationOptions}
                  selectedGeneration={selectedGeneration}
                  selectedGenerationScopedPath={selectedGenerationScopedPath}
                  viewer={viewer}
                  onNavigate={() => setMobileOpen(false)}
                  onSignOut={handleSignOut}
                  isSignOutPending={isSignOutPending}
                />
              </div>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
