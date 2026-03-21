import { ReactNode } from "react";
import MotionReveal from "@/app/(home)/_components/motion-reveal";

type SectionShellProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

/**
 * SectionShell 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param props 함수 로직에서 사용하는 입력값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function SectionShell({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
}: SectionShellProps) {
  return (
    <section id={id} className={["px-4 py-12 md:px-8 md:py-16", className].join(" ")}>
      <div className="mx-auto w-full max-w-[1200px]">
        <MotionReveal className="mb-10 text-center md:mb-12">
          {eyebrow ? (
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-(--text-muted)">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-[2.2rem] leading-tight tracking-[-0.02em] text-(--text-primary) md:text-[2.5rem]">
            {title}
          </h2>
          {description ? (
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-(--text-muted) md:text-base">
              {description}
            </p>
          ) : null}
        </MotionReveal>
        {children}
      </div>
    </section>
  );
}
