import type { ReactNode } from "react";

type PublicHeaderSafeAreaProps = Readonly<{
  children: ReactNode;
  className?: string;
}>;

export default function PublicHeaderSafeArea({
  children,
  className,
}: PublicHeaderSafeAreaProps) {
  const rootClassName = [
    "pt-[var(--public-header-height-mobile)] md:pt-[var(--public-header-height-desktop)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName} data-testid="public-header-safe-area">
      {children}
    </div>
  );
}
