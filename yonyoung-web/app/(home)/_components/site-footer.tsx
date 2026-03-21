import Image from "next/image";
import { Suspense } from "react";
import { DEFAULT_SITE_SETTINGS } from "@/shared/contracts/api-contracts";
import { getPublicSiteSettings } from "@/features/public/services/public-read-service";
import CurrentYear from "@/app/(home)/_components/current-year";

const infoLabelClass = "text-[0.85rem] font-bold uppercase text-(--footer-muted)";
const infoContentClass = "break-all text-[0.9rem] leading-[1.6] text-(--footer-muted)";
const infoLinkClass = `${infoContentClass} inline-flex min-h-11 w-full items-center`;

export default async function SiteFooter() {
  const siteSettings = await getPublicSiteSettings().catch(() => DEFAULT_SITE_SETTINGS);
  const instagramId = siteSettings.footerInstagramId.replace(/^@+/, "");
  const instagramUrl = `https://www.instagram.com/${encodeURIComponent(instagramId)}`;

  return (
    <footer
      className="mt-16 bg-(--footer-bg) pb-6 pt-12 text-(--footer-text) md:pb-8 md:pt-16"
      data-testid="public-footer"
    >
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <div className="mb-6 border-b border-(--surface-strong-border) pb-6 md:mb-8 md:pb-8">
          <div className="flex items-center gap-[0.6rem]">
            <div className="flex h-[1.92rem] items-center justify-center">
              <Image
                src="/yonyong-logo-white.png"
                alt="연영회 로고"
                width={40}
                height={40}
                unoptimized
                className="h-full w-auto object-contain"
              />
            </div>
            <div className="text-left text-[0.8rem] leading-[1.2] font-bold tracking-[-0.02em] text-(--footer-text)">
              <span className="block tracking-[-0.05em]">연세대학교 중앙사진동아리</span>
              연영회
            </div>
          </div>
        </div>

        <div className="mb-12">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-5 lg:gap-6">
            <div className="flex flex-col gap-2">
              <span className={infoLabelClass}>오픈 카톡방</span>
              <a
                href={siteSettings.footerOpenChatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${infoLinkClass} transition-colors duration-300 hover:text-(--footer-text)`}
              >
                {siteSettings.footerOpenChatUrl}
              </a>
            </div>

            <div className="flex flex-col gap-2">
              <span className={infoLabelClass}>INSTAGRAM</span>
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${infoLinkClass} transition-colors duration-300 hover:text-(--footer-text)`}
              >
                @{instagramId}
              </a>
            </div>

            <div className="flex flex-col gap-2">
              <span className={infoLabelClass}>E-mail</span>
              <a
                href={`mailto:${siteSettings.footerEmail}`}
                className={`${infoLinkClass} transition-colors duration-300 hover:text-(--footer-text)`}
              >
                {siteSettings.footerEmail}
              </a>
            </div>

            <div className="flex flex-col gap-2">
              <span className={infoLabelClass}>HP</span>
              <span className={infoContentClass}>{siteSettings.footerPhone}</span>
            </div>

            <div className="flex flex-col gap-2">
              <span className={infoLabelClass}>주소</span>
              <span className={infoContentClass}>{siteSettings.footerAddress}</span>
            </div>
          </div>
        </div>
        <div className="border-t border-(--surface-strong-border) pt-4 md:pt-5">
          <p className="text-[0.8rem] leading-normal text-(--footer-muted)">
            ©{" "}
            <Suspense fallback={null}>
              <CurrentYear />
            </Suspense>{" "}
            연세대학교 중앙사진동아리 연영회. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
