import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import MembersGrid from "@/app/(dashboard)/dashboard/settings/members/members-grid";

export default async function SettingsMembersPage() {
  await serverAuthGuard.requireGlobalUserManagementAccess();

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
          Settings / Members
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
          전체 멤버 관리
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          전체 멤버의 권한, 소속 기수, 기본 정보를 보고 검색과 필터로 원하는 사용자를
          빠르게 찾을 수 있으며, 여러 명을 선택해 권한을 한 번에 수정할 수 있습니다.
        </p>
        <MembersGrid />
      </section>
    </main>
  );
}
