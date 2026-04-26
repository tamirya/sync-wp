"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Toolbar button                                                      */
/* ------------------------------------------------------------------ */
function ToolBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded p-1 text-sm transition hover:bg-muted-bg ${
        active ? "bg-primary/10 text-primary" : "text-muted"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  HtmlEditor                                                          */
/* ------------------------------------------------------------------ */
type Props = {
  name: string;
  label: string;
  initialValue: string;
  onChange?: (html: string) => void;
  minRows?: number;
};

export function HtmlEditor({
  name,
  label,
  initialValue,
  onChange,
  minRows = 4,
}: Props) {
  const [html, setHtml] = useState(initialValue);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: initialValue,
    editorProps: {
      attributes: {
        class: "tiptap-content outline-none",
        style: `min-height: ${minRows * 1.6}rem`,
      },
    },
    onUpdate({ editor }) {
      const next = editor.getHTML();
      setHtml(next);
      onChange?.(next);
    },
  });

  /* sync if initialValue changes externally */
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== initialValue) {
      editor.commands.setContent(initialValue, false);
      setHtml(initialValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-muted-bg/90 ring-1 ring-border/80 focus-within:ring-2 focus-within:ring-ring overflow-hidden">
      {/* Label */}
      <div className="px-4 pt-3">
        <span className="text-sm font-bold text-primary">{label}</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 px-3 pb-2">
        <ToolBtn
          title="Bold"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive("bold")}
        >
          <strong>B</strong>
        </ToolBtn>
        <ToolBtn
          title="Italic"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive("italic")}
        >
          <em>I</em>
        </ToolBtn>
        <ToolBtn
          title="Strikethrough"
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          active={editor?.isActive("strike")}
        >
          <s>S</s>
        </ToolBtn>
        <span className="mx-1 h-4 w-px bg-border/60" />
        <ToolBtn
          title="Heading 2"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor?.isActive("heading", { level: 2 })}
        >
          H2
        </ToolBtn>
        <ToolBtn
          title="Heading 3"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor?.isActive("heading", { level: 3 })}
        >
          H3
        </ToolBtn>
        <span className="mx-1 h-4 w-px bg-border/60" />
        <ToolBtn
          title="Bullet list"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive("bulletList")}
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
            <circle cx="2" cy="4" r="1.5" />
            <rect x="5" y="3" width="9" height="2" rx="1" />
            <circle cx="2" cy="8" r="1.5" />
            <rect x="5" y="7" width="9" height="2" rx="1" />
            <circle cx="2" cy="12" r="1.5" />
            <rect x="5" y="11" width="9" height="2" rx="1" />
          </svg>
        </ToolBtn>
        <ToolBtn
          title="Ordered list"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive("orderedList")}
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
            <text x="0" y="5" fontSize="5" fontFamily="monospace">
              1.
            </text>
            <rect x="5" y="3" width="9" height="2" rx="1" />
            <text x="0" y="9" fontSize="5" fontFamily="monospace">
              2.
            </text>
            <rect x="5" y="7" width="9" height="2" rx="1" />
            <text x="0" y="13" fontSize="5" fontFamily="monospace">
              3.
            </text>
            <rect x="5" y="11" width="9" height="2" rx="1" />
          </svg>
        </ToolBtn>
        <span className="mx-1 h-4 w-px bg-border/60" />
        <ToolBtn
          title="Undo"
          onClick={() => editor?.chain().focus().undo().run()}
        >
          ↩
        </ToolBtn>
        <ToolBtn
          title="Redo"
          onClick={() => editor?.chain().focus().redo().run()}
        >
          ↪
        </ToolBtn>
      </div>

      {/* Editor area */}
      <div className="px-4 py-2">
        <EditorContent editor={editor} />
      </div>

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={html} readOnly />
    </div>
  );
}
