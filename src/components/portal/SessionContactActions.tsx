import { Button } from "@/components/ui/button";
import { Phone, MessageSquare } from "lucide-react";

/** Normalize a stored phone number to a tel:/sms: friendly E.164-ish value. */
export function toDialable(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length > 11) return `+${digits}`;
  if (digits.length < 7) return null;
  return `+${digits}`;
}

interface Props {
  studentPhone?: string | null;
  guardianPhone?: string | null;
  className?: string;
}

export function SessionContactActions({ studentPhone, guardianPhone, className }: Props) {
  const student = toDialable(studentPhone);
  const guardian = toDialable(guardianPhone);
  if (!student && !guardian) return null;

  const actions: { label: string; href: string; icon: typeof Phone }[] = [];
  if (student) {
    actions.push({ label: "Call Student", href: `tel:${student}`, icon: Phone });
    actions.push({ label: "Text Student", href: `sms:${student}`, icon: MessageSquare });
  }
  if (guardian) {
    actions.push({ label: "Call Guardian", href: `tel:${guardian}`, icon: Phone });
    actions.push({ label: "Text Guardian", href: `sms:${guardian}`, icon: MessageSquare });
  }

  return (
    <div className={`grid grid-cols-2 gap-2 ${className || ""}`}>
      {actions.map((a) => (
        <Button
          key={a.label}
          asChild
          variant="outline"
          size="sm"
          className="min-h-[44px] justify-start gap-2 text-xs sm:text-sm"
        >
          <a href={a.href}>
            <a.icon className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{a.label}</span>
          </a>
        </Button>
      ))}
    </div>
  );
}
