import Link from "next/link";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isPresidentOrVicePresidentRole } from "@/features/auth/model/auth-shared";
import { buildDashboardSettingsMenuItems } from "@/features/dashboard/settings/dashboard-settings-menu";
import { isMemberLikeRoleValue } from "@/shared/contracts/auth-roles";
export default async function SettingsPage() {
  const session = await serverAuthGuard.requireSession();
  const settingsItems = buildDashboardSettingsMenuItems({
    canManagePrivilegedSettings: isPresidentOrVicePresidentRole(session.user.role),
    isMemberLikeRole: isMemberLikeRoleValue(session.user.role),
  });

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
          Settings
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
          대시보드 설정
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
          이곳에서 개인 프로필과 운영에 필요한 설정 항목을 한 번에 확인하고 이동할 수
          있습니다.
        </p>

        <ul className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {settingsItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 transition hover:border-slate-300 hover:bg-white"
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{item.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {item.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
