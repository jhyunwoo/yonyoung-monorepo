import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";
import MembersGrid from "@/app/(dashboard)/dashboard/[generationName]/members/members-grid";

export default async function GenerationMembersPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string }>;
}>) {
  const generation = await requireDashboardGeneration(params);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
          Members
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">
          {generation.name} 멤버 관리
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          이 기수에 소속된 멤버를 확인하고 상세 정보를 볼 수 있습니다.
        </p>
        <MembersGrid generationId={generation.id} generationPath={generation.path} />
      </section>
    </main>
  );
}
