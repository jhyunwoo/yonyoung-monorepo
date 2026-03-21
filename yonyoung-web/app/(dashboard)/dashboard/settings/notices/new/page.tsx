import NoticeCreateForm from "@/app/(dashboard)/_components/notice-create-form";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isPresidentOrVicePresidentRole } from "@/features/auth/model/auth-shared";

export default async function SettingsNoticeCreatePage() {
  const session = await serverAuthGuard.requireSession();
  const noticesBasePath = "/dashboard/settings/notices";

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <NoticeCreateForm
        scope="global"
        canWrite={isPresidentOrVicePresidentRole(session.user.role)}
        basePath={noticesBasePath}
        listPath={noticesBasePath}
        heading="전체 공지 작성"
        description="공지 제목과 내용을 입력하고 저장하면 상세 화면으로 이동합니다."
      />
    </main>
  );
}
