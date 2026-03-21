import { sanitizeRichTextHtml } from "@/features/media/rich-text/rich-text";

type RichTextContentProps = {
  html: string;
  className?: string;
};

const BASE_CLASS_NAMES = [
  "text-sm leading-relaxed text-slate-700 dark:text-slate-200",
  "[&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 dark:[&_h2]:text-slate-100",
  "[&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900 dark:[&_h3]:text-slate-100",
  "[&_p]:my-2",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-600 dark:[&_blockquote]:border-slate-600 dark:[&_blockquote]:text-slate-300",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:text-xs [&_pre]:text-slate-100 dark:[&_pre]:bg-slate-950",
  "[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs dark:[&_code]:bg-slate-800/80 dark:[&_code]:text-slate-100",
  "[&_a]:text-blue-700 [&_a]:underline dark:[&_a]:text-blue-300",
  "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
  "[&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold dark:[&_th]:border-slate-600 dark:[&_th]:bg-slate-800/70",
  "[&_td]:border [&_td]:border-slate-300 [&_td]:px-2 [&_td]:py-1 dark:[&_td]:border-slate-600",
].join(" ");

export const HIGH_CONTRAST_RICH_TEXT_CLASS_NAMES = [
  "!text-black dark:!text-slate-200",
  "[&_p]:!text-black dark:[&_p]:!text-slate-200",
  "[&_li]:!text-black dark:[&_li]:!text-slate-200",
  "[&_span]:!text-black dark:[&_span]:!text-slate-200",
  "[&_small]:!text-black dark:[&_small]:!text-slate-200",
  "[&_strong]:!text-black dark:[&_strong]:!text-slate-100",
  "[&_em]:!text-black dark:[&_em]:!text-slate-200",
  "[&_h2]:!text-black dark:[&_h2]:!text-slate-100",
  "[&_h3]:!text-black dark:[&_h3]:!text-slate-100",
  "[&_td]:!text-black dark:[&_td]:!text-slate-200",
  "[&_th]:!text-black dark:[&_th]:!text-slate-100",
  "[&_blockquote]:!text-black dark:[&_blockquote]:!text-slate-300",
  "[&_a]:!text-blue-700 dark:[&_a]:!text-blue-300",
].join(" ");

export const RichTextContent = ({ html, className }: RichTextContentProps) => {
  const mergedClassName = className
    ? `${BASE_CLASS_NAMES} ${className}`
    : BASE_CLASS_NAMES;
  const sanitizedHtml = sanitizeRichTextHtml(html);

  return (
    <div
      className={mergedClassName}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
