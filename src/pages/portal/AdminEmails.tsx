import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Search, Loader2, Eye } from "lucide-react";
import { format, parseISO } from "date-fns";

interface EmailLogRow {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export default function AdminEmails() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'staff', 'instructor']}>
      <PortalLayout>
        <Content />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function Content() {
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async (q?: string) => {
    setLoading(true);
    const { data, error } = await supabase.rpc('list_visible_emails', {
      p_limit: 300,
      p_search: q?.trim() || null,
    });
    if (!error) setRows((data || []) as EmailLogRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const statusColor = (s: string) => {
    if (s === 'sent') return 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30';
    if (s === 'failed' || s === 'bounced' || s === 'dlq') return 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30';
    if (s === 'suppressed' || s === 'complained') return 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold theme-heading flex items-center gap-2">
          <Mail className="h-7 w-7 text-primary" />
          Sent Emails
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading ? 'Loading...' : `${rows.length} email${rows.length === 1 ? '' : 's'}`}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Filter by recipient email or template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No emails found</div>
          ) : (
            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.id} className="p-3 sm:p-4 flex items-start justify-between gap-3 hover:bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{r.template_name}</span>
                      <Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">→ {r.recipient_email}</p>
                    {r.error_message && (
                      <p className="text-xs text-red-500 mt-1">{r.error_message}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(parseISO(r.created_at), 'MMM d, yyyy')}
                    </p>
                    <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {format(parseISO(r.created_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
