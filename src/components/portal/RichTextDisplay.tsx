import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { looksLikeHtml } from "./RichTextEditor";

interface RichTextDisplayProps {
  value: string | null | undefined;
  className?: string;
}

const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i"];
const ALLOWED_ATTR: string[] = [];

/**
 * Renders lesson summary content that may be HTML (bold/italic from the editor)
 * or legacy plain text. HTML is sanitized with DOMPurify; plain text is rendered
 * with preserved whitespace so old records display exactly as before.
 */
export function RichTextDisplay({ value, className }: RichTextDisplayProps) {
  if (!value) return null;

  if (looksLikeHtml(value)) {
    const clean = DOMPurify.sanitize(value, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
    });
    return (
      <div
        className={cn(
          "prose prose-sm max-w-none text-inherit [&_p]:my-1 [&_strong]:font-semibold [&_em]:italic",
          className
        )}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  return <p className={cn("whitespace-pre-wrap", className)}>{value}</p>;
}
