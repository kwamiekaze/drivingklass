import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

interface RoadTestEmail {
  id: string;
  recipient_type: 'student' | 'instructor';
  recipient_email: string;
  subject: string;
  sent_at: string;
  status: string;
  error_message: string | null;
}

interface Props {
  sessionId: string;
}

export function RoadTestSentEmails({ sessionId }: Props) {
  const [emails, setEmails] = useState<RoadTestEmail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('road_test_emails')
        .select('*')
        .eq('session_id', sessionId)
        .order('sent_at', { ascending: false });
      if (!cancelled) {
        setEmails((data || []) as RoadTestEmail[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (loading) return null;
  if (emails.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card/40 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Sent Emails</h4>
        <Badge variant="secondary" className="text-[10px] h-5">{emails.length}</Badge>
      </div>
      <ul className="space-y-2">
        {emails.map((e) => {
          const ok = e.status === 'sent';
          return (
            <li key={e.id} className="flex items-start gap-2 text-xs">
              {ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-600 shrink-0" />
              ) : (
                <XCircle className="h-3.5 w-3.5 mt-0.5 text-destructive shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] h-4 capitalize">{e.recipient_type}</Badge>
                  <span className="font-medium truncate">{e.recipient_email}</span>
                  <span className="text-muted-foreground">
                    · {format(parseISO(e.sent_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                <div className="text-muted-foreground truncate">{e.subject}</div>
                {!ok && e.error_message && (
                  <div className="text-destructive">{e.error_message}</div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
