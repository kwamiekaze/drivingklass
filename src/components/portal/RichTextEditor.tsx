import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold as BoldIcon, Italic as ItalicIcon } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}

/**
 * Lightweight bold/italic rich text editor for report card lesson summaries.
 * Emits HTML. Reads either HTML or legacy plain text (auto-wrapped as <p>).
 */
export function RichTextEditor({ value, onChange, placeholder, className, minHeight = 120 }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        code: false,
      }),
    ],
    content: normalizeInitial(value),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Treat empty editor as empty string
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none px-3 py-2",
          "text-foreground [&_p]:my-1 [&_strong]:font-semibold"
        ),
        style: `min-height:${minHeight}px`,
        "data-placeholder": placeholder ?? "",
      },
    },
  });

  // Sync when external value changes (e.g., draft load) and differs from current
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = normalizeInitial(value) || "";
    if (incoming !== current && incoming !== "<p></p>") {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className={cn("rounded-md border border-input bg-background", className)}
        style={{ minHeight: minHeight + 40 }}
      />
    );
  }

  return (
    <div className={cn("rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring", className)}>
      <div className="flex items-center gap-1 border-b border-input px-2 py-1">
        <Toggle
          size="sm"
          pressed={editor.isActive("bold")}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <BoldIcon className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("italic")}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <ItalicIcon className="h-4 w-4" />
        </Toggle>
        <span className="ml-auto text-[10px] text-muted-foreground select-none">Cmd/Ctrl+B · Cmd/Ctrl+I</span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

/**
 * Convert legacy plain text (no HTML tags) into a paragraph so Tiptap can render it.
 */
function normalizeInitial(value: string | null | undefined): string {
  if (!value) return "";
  if (looksLikeHtml(value)) return value;
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Preserve line breaks
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}
