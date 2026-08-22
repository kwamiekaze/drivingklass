import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  GAME_INVITE_PRESET, confirmationPhraseFor, requiresPhrase,
  type CampaignAudience, type CampaignCounts, type CampaignReadiness,
} from '@/lib/campaignPreset';
import { Loader2, Send, Eye, ShieldAlert, Sparkles, Ban, RefreshCw } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leadIds: string[];
  defaultAudience?: CampaignAudience;
}

async function callCampaign(payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-marketing-campaign', { body: payload });
  if (error) {
    let detail = error.message;
    try {
      const ctx = (error as unknown as { context?: Response }).context;
      if (ctx) detail = await ctx.text();
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return data as Record<string, any>;
}

export function CampaignComposer({ open, onOpenChange, leadIds, defaultAudience = 'both' }: Props) {
  const { toast } = useToast();
  const [audience, setAudience] = useState<CampaignAudience>(defaultAudience);
  const [subject, setSubject] = useState<string>(GAME_INVITE_PRESET.subject);
  const [bodyText, setBodyText] = useState<string>(GAME_INVITE_PRESET.body);
  const [readiness, setReadiness] = useState<CampaignReadiness | null>(null);
  const [counts, setCounts] = useState<CampaignCounts | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const submitting = useRef(false);

  const refresh = useCallback(async () => {
    setBusy('preview');
    try {
      const res = await callCampaign({
        action: 'preview', lead_ids: leadIds, audience, subject, body_text: bodyText,
      });
      setCounts(res.counts);
      setPreviewHtml(res.html);
      setReadiness(res.readiness);
    } catch (e) {
      toast({ title: 'Preview failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }, [leadIds, audience, subject, bodyText, toast]);

  useEffect(() => { if (open) { idempotencyKey.current = crypto.randomUUID(); void refresh(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const eligible = counts?.eligible ?? 0;
  const needsPhrase = requiresPhrase(eligible);
  const phraseOk = !needsPhrase || phrase.trim() === confirmationPhraseFor(eligible);
  const canSend = !!readiness?.canSendLive && eligible > 0;

  const sendTest = async () => {
    setBusy('test');
    try {
      const res = await callCampaign({ action: 'send_test', subject, body_text: bodyText });
      toast({ title: `Test email sent to ${res.to}` });
    } catch (e) {
      toast({ title: 'Test send failed', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const confirmSend = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy('send');
    try {
      const created = await callCampaign({
        action: 'create', idempotency_key: idempotencyKey.current,
        name: 'Admin campaign', subject, body_text: bodyText, audience,
        lead_ids: leadIds, filter_snapshot: { audience, lead_count: leadIds.length },
      });
      await callCampaign({
        action: 'confirm', campaign_id: created.campaign_id,
        confirmation_phrase: needsPhrase ? confirmationPhraseFor(eligible) : undefined,
      });
      toast({ title: 'Campaign started', description: `${eligible} recipients queued.` });
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Send blocked', description: (e as Error).message, variant: 'destructive' });
    } finally {
      submitting.current = false;
      setBusy(null);
    }
  };

  const countChips = useMemo(() => counts ? ([
    ['eligible', counts.eligible, 'bg-green-500/10 text-green-700 dark:text-green-400'],
    ['duplicate', counts.duplicates, ''],
    ['invalid', counts.invalid, 'bg-amber-500/10 text-amber-700 dark:text-amber-400'],
    ['unsubscribed', counts.unsubscribed, 'bg-orange-500/10 text-orange-700 dark:text-orange-400'],
    ['suppressed', counts.suppressed, 'bg-orange-500/10 text-orange-700 dark:text-orange-400'],
    ['consent unknown', counts.missingConsent, 'bg-red-500/10 text-red-700 dark:text-red-400'],
    ['consent revoked', counts.revokedConsent, 'bg-red-500/10 text-red-700 dark:text-red-400'],
  ] as const) : [], [counts]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Campaign Composer</DialogTitle>
            <DialogDescription>
              Marketing send via the dedicated marketing domain. Transactional emails are unaffected.
            </DialogDescription>
          </DialogHeader>

          {readiness && !readiness.canSendLive && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <ShieldAlert className="h-4 w-4" /> Live sending is disabled
                </CardTitle>
                <CardDescription className="text-xs">Resolve every blocker below before a live campaign can be confirmed.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="list-disc pl-5 text-xs space-y-1">
                  {readiness.blockers.map((b) => <li key={b}>{b}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          {readiness && (
            <p className="text-xs text-muted-foreground">
              From: {readiness.fromName} &lt;{readiness.fromEmail}&gt; · Reply-To: {readiness.replyTo}
            </p>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Audience</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as CampaignAudience)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Students only</SelectItem>
                    <SelectItem value="guardian">Guardians only</SelectItem>
                    <SelectItem value="both">Students + guardians</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setSubject(GAME_INVITE_PRESET.subject); setBodyText(GAME_INVITE_PRESET.body); }}>
                  Load Game Invite preset
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs">Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Body</Label>
              <Textarea rows={9} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={refresh} disabled={busy === 'preview'}>
                {busy === 'preview' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
                Refresh preview & counts
              </Button>
              <Button variant="outline" size="sm" onClick={sendTest} disabled={busy === 'test' || !readiness?.hasKey}>
                {busy === 'test' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                Send test to myself
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {countChips.map(([label, value, cls]) => (
                <Badge key={label} variant="outline" className={cls as string}>{value} {label}</Badge>
              ))}
            </div>

            {previewHtml && (
              <iframe title="Campaign preview" srcDoc={previewHtml} sandbox=""
                className="w-full h-[380px] rounded border bg-white" />
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
            <Button disabled={!canSend} onClick={() => { setPhrase(''); setConfirmOpen(true); }}>
              <Send className="h-4 w-4 mr-1.5" /> Review &amp; send live ({eligible})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm live campaign</DialogTitle>
            <DialogDescription>
              This will email <strong>{eligible}</strong> consented recipient{eligible === 1 ? '' : 's'} individually.
              Each message is private and includes an unsubscribe link.
            </DialogDescription>
          </DialogHeader>
          {needsPhrase && (
            <div className="space-y-1.5">
              <Label className="text-xs">Type <code>{confirmationPhraseFor(eligible)}</code> to continue</Label>
              <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={confirmationPhraseFor(eligible)} />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button disabled={!phraseOk || busy === 'send'} onClick={confirmSend}>
              {busy === 'send' && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Send now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CampaignHistoryPanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) toast({ title: 'Could not load campaigns', description: error.message, variant: 'destructive' });
    setRows(data || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const act = async (action: string, id: string) => {
    try {
      await callCampaign({ action, campaign_id: id });
      toast({ title: `Campaign ${action} requested` });
      void load();
    } catch (e) {
      toast({ title: `Could not ${action}`, description: (e as Error).message, variant: 'destructive' });
    }
  };

  return (
    <Card className="portal-card">
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Campaign history</CardTitle>
          <CardDescription>Every marketing campaign with per-recipient outcomes.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No campaigns yet.</p>
        ) : (
          <div className="divide-y">
            {rows.map((c) => (
              <div key={c.id} className="p-3 sm:p-4 flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleString()} · {c.audience} · {c.sent_count}/{c.total_recipients} sent
                    {c.failed_count ? ` · ${c.failed_count} failed` : ''}
                    {c.skipped_count ? ` · ${c.skipped_count} skipped` : ''}
                  </p>
                </div>
                <Badge variant="outline">{c.status}</Badge>
                {['draft', 'sending', 'paused'].includes(c.status) && (
                  <Button size="sm" variant="ghost" onClick={() => act('cancel', c.id)}>
                    <Ban className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                )}
                {c.failed_count > 0 && c.status !== 'sending' && (
                  <Button size="sm" variant="outline" onClick={() => act('retry', c.id)}>Retry failed</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
