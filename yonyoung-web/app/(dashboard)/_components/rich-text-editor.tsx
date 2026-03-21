"use client";

import { useEffect } from "react";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  minHeight?: number;
};

type ToolbarButtonProps = {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
};

export const EMPTY_RICH_TEXT_HTML = "<p></p>";

const ToolbarButton = ({
  label,
  onClick,
  active = false,
  disabled = false,
}: ToolbarButtonProps) => {
  return (
    <button
      type="button"
      data-testid="rich-text-toolbar-button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded border px-2 py-1 text-xs font-semibold transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {label}
    </button>
  );
};

export default function RichTextEditor({
  value,
  onChange,
  disabled = false,
  minHeight = 220,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value.length > 0 ? value : EMPTY_RICH_TEXT_HTML,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate({ editor: currentEditor }) {
      onChange(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextContent = value.length > 0 ? value : EMPTY_RICH_TEXT_HTML;
    if (editor.getHTML() === nextContent) {
      return;
    }

    editor.commands.setContent(nextContent, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const handleSetLink = () => {
    if (!editor || disabled) {
      return;
    }

    const previousLink = editor.getAttributes("link").href as string | undefined;
    const nextLink = window.prompt(
      "링크 주소를 입력하세요. 비워 두면 링크가 삭제됩니다.",
      previousLink ?? "https://",
    );

    if (nextLink === null) {
      return;
    }

    const trimmedLink = nextLink.trim();
    if (trimmedLink.length === 0) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmedLink }).run();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2">
        <ToolbarButton
          label="H2"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor?.isActive("heading", { level: 2 })}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="H3"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor?.isActive("heading", { level: 3 })}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="굵게"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive("bold")}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="기울임"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive("italic")}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="밑줄"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          active={editor?.isActive("underline")}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="글머리"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive("bulletList")}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="번호"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive("orderedList")}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="인용"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          active={editor?.isActive("blockquote")}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="코드블록"
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          active={editor?.isActive("codeBlock")}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="링크"
          onClick={handleSetLink}
          active={editor?.isActive("link")}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="표 추가"
          onClick={() =>
            editor
              ?.chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="행 추가"
          onClick={() => editor?.chain().focus().addRowAfter().run()}
          disabled={disabled || !editor || !editor?.isActive("table")}
        />
        <ToolbarButton
          label="열 추가"
          onClick={() => editor?.chain().focus().addColumnAfter().run()}
          disabled={disabled || !editor || !editor?.isActive("table")}
        />
        <ToolbarButton
          label="표 삭제"
          onClick={() => editor?.chain().focus().deleteTable().run()}
          disabled={disabled || !editor || !editor?.isActive("table")}
        />
      </div>

      <div
        className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2"
        style={{ minHeight }}
      >
        <EditorContent
          editor={editor}
          className="prose-editor text-sm text-slate-900 dark:text-slate-50 outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_p]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-slate-300 [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded [&_.ProseMirror_pre]:bg-slate-900 [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:text-xs [&_.ProseMirror_pre]:text-slate-100 [&_.ProseMirror_table]:my-2 [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-slate-300 [&_.ProseMirror_td]:p-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-slate-300 [&_.ProseMirror_th]:bg-slate-50 [&_.ProseMirror_th]:p-2"
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}
