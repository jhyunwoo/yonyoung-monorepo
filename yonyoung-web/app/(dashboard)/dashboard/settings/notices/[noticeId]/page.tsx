import NoticeDetail from "@/app/(dashboard)/_components/notice-detail";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isPresidentOrVicePresidentRole } from "@/features/auth/model/auth-shared";

export default async function SettingsNoticeDetailPage({
  params,
}: Readonly<{
  params: Promise<{ noticeId: string }>;
}>) {
  const [{ noticeId }, session] = await Promise.all([
    params,
    serverAuthGuard.requireSession(),
  ]);
  const noticesBasePath = "/dashboard/settings/notices";
  const detailPath = `${noticesBasePath}/${noticeId}`;

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <NoticeDetail
        scope="global"
        noticeId={noticeId}
        canWrite={isPresidentOrVicePresidentRole(session.user.role)}
        listPath={noticesBasePath}
        editPath={`${detailPath}/edit`}
        allowInlineEdit={false}
        heading="전체 공지 상세"
        description="공지 내용을 확인하고 필요하면 수정 화면에서 내용을 바꾸거나 삭제할 수 있습니다."
      />
    </main>
  );
}
