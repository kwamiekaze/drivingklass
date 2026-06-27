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

  const [viewing, setViewing] = useState<EmailLogRow | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewHtml, setViewHtml] = useState<string>('');
  const [viewSubject, setViewSubject] = useState<string>('');
  const [viewError, setViewError] = useState<string>('');

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

  const openEmail = async (row: EmailLogRow) => {
    setViewing(row);
    setViewHtml('');
    setViewSubject('');
    setViewError('');
    setViewLoading(true);
    const { data, error } = await supabase.rpc('get_email_render', { p_log_id: row.id });
    setViewLoading(false);
    if (error) {
      setViewError(error.message || 'Unable to load email content');
      return;
    }
    const rec = Array.isArray(data) ? data[0] : data;
    if (!rec) {
      setViewError('Email content not available');
      return;
    }
    setViewSubject(rec.subject || '');
    setViewHtml(rec.html || '');
    if (!rec.html) setViewError('No rendered content stored for this email (likely sent before content archiving was enabled).');
  };

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
          {loading ? 'Loading...' : `${rows.length} email${rows.length === 1 ? '' : 's'} — tap any row to view the full message`}
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
                <button
                  key={r.id}
                  onClick={() => openEmail(r)}
                  className="w-full text-left p-3 sm:p-4 flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors"
                >
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
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(parseISO(r.created_at), 'MMM d, yyyy')}
                    </p>
                    <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {format(parseISO(r.created_at), 'h:mm a')}
                    </p>
                    <Eye className="h-3.5 w-3.5 text-muted-foreground/70" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => { if (!o) setViewing(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="text-base flex items-center gap-2 flex-wrap">
              <Mail className="h-4 w-4 text-primary" />
              <span className="truncate">{viewSubject || viewing?.template_name || 'Email'}</span>
            </DialogTitle>
            {viewing && (
              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                <p><span className="font-medium text-foreground/80">To:</span> {viewing.recipient_email}</p>
                <p><span className="font-medium text-foreground/80">Template:</span> {viewing.template_name} · {viewing.status} · {format(parseISO(viewing.created_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/30 p-3 sm:p-4">
            {viewLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : viewError && !viewHtml ? (
              <div className="text-center py-12 text-sm text-muted-foreground">{viewError}</div>
            ) : (
              <iframe
                title="Email content"
                srcDoc={viewHtml}
                sandbox=""
                className="w-full h-[70vh] bg-white rounded border"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
