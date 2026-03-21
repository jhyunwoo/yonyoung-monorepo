import type { ReactNode } from "react";

type PageTitleHeroProps = Readonly<{
  title: string;
  description?: ReactNode;
}>;

export default function PageTitleHero({ title, description }: PageTitleHeroProps) {
  return (
    <section className="mb-16 border-b border-(--surface-border) py-8 text-center md:py-16">
      <h1 className="mb-4 text-[2rem] leading-[1.2] font-bold text-(--text-primary) md:text-[3rem]">
        {title}
      </h1>
      {description ? (
        <p className="mb-4 text-lg text-(--text-muted)">{description}</p>
      ) : null}
    </section>
  );
}
