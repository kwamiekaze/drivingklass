import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { ThemeProviderContext_, useTheme } from "@/components/ThemeProvider";

/**
 * The contact form from the bottom of the page, in a see-through glass popup, so a visitor can write to us from the first
 * screen without scrolling. It is the very same form: same fields, same checks, same email to the admin. The form is shown
 * in its dark look so its labels stay readable on the glass in day and at night.
 */
export function MessagePopup({ onClose }: { onClose: () => void }) {
  const ctx = useTheme();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);
  return (
    <div className="n2-pop-layer n2-msg-layer" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="n2-pop n2-msg" role="dialog" aria-modal="true" aria-labelledby="n2-msg-h">
        <header className="n2-pop-head">
          <div>
            <span className="n2-pop-eyebrow">★ ★ ★ ★ ★</span>
            <h2 id="n2-msg-h" className="n2-pop-title">Send us a message</h2>
          </div>
          <button ref={closeRef} type="button" className="n2-x" aria-label="Close message form" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </header>
        <div className="n2-msg-body">
          <ThemeProviderContext_.Provider value={{ ...ctx, resolvedTheme: "dark" }}>
            <ContactForm />
          </ThemeProviderContext_.Provider>
        </div>
      </section>
    </div>
  );
}
