import { redirect } from "next/navigation";
import NoticeEditForm from "@/app/(dashboard)/_components/notice-edit-form";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isPresidentOrVicePresidentRole } from "@/features/auth/model/auth-shared";

export default async function SettingsNoticeEditPage({
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

  if (!isPresidentOrVicePresidentRole(session.user.role)) {
    redirect(detailPath);
  }

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <NoticeEditForm
        scope="global"
        noticeId={noticeId}
        canWrite
        listPath={noticesBasePath}
        detailPath={detailPath}
        heading="전체 공지 수정"
        description="공지 제목, 내용, 첨부 이미지를 수정할 수 있습니다."
      />
    </main>
  );
}
