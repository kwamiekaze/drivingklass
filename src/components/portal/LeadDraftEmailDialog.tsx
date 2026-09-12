import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DEFAULT_DRAFT_BODY, DEFAULT_DRAFT_SUBJECT, DRAFT_TO_ADDRESS,
  buildDraftBatches, collectRecipients,
  type DraftAudience, type DraftRecipientSource,
} from '@/lib/leadDraftEmail';
import { ExternalLink, Mail, RotateCcw } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rows: DraftRecipientSource[];
  /** Optional context line, e.g. "12 selected leads". */
  scopeLabel?: string;
  loading?: boolean;
  error?: string | null;
}

export function LeadDraftEmailDialog({ open, onOpenChange, rows, scopeLabel, loading, error }: Props) {
  const [audience, setAudience] = useState<DraftAudience>('both');
  const [subject, setSubject] = useState(DEFAULT_DRAFT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_DRAFT_BODY);
  const [opened, setOpened] = useState<Record<number, boolean>>({});

  useEffect(() => { if (open) setOpened({}); }, [open, audience, rows]);

  const collection = useMemo(() => collectRecipients(rows, audience), [rows, audience]);
  const batches = useMemo(
    () => buildDraftBatches(collection.recipients, { subject, body }),
    [collection.recipients, subject, body],
  );

  const isDefaultCopy = subject === DEFAULT_DRAFT_SUBJECT && body === DEFAULT_DRAFT_BODY;
  const excluded = collection.invalid + collection.duplicates;

  const openDraft = (index: number, url: string, fallback: string) => {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) window.location.href = fallback;
    setOpened((p) => ({ ...p, [index]: true }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Draft email
          </DialogTitle>
          <DialogDescription>
            This only opens Gmail compose drafts in new tabs — nothing is ever sent from the portal.
            Recipients are placed in BCC and the visible To address is {DRAFT_TO_ADDRESS}.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading recipients…</p>
        ) : error ? (
          <p className="text-sm text-destructive py-6 text-center">{error}</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Recipients</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as DraftAudience)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="students">Students</SelectItem>
                    <SelectItem value="guardians">Guardians</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <Badge variant="outline">{collection.recipients.length} unique recipients</Badge>
                <Badge variant="outline">{excluded} excluded</Badge>
                <Badge variant="outline">{batches.length} draft{batches.length === 1 ? '' : 's'}</Badge>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {scopeLabel ? `${scopeLabel} · ` : ''}
              {collection.invalid} blank or invalid address{collection.invalid === 1 ? '' : 'es'} skipped ·{' '}
              {collection.duplicates} repeat address{collection.duplicates === 1 ? '' : 'es'} removed ·{' '}
              {collection.rowsWithoutAddress} lead{collection.rowsWithoutAddress === 1 ? '' : 's'} with no usable address
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <Button
                  size="sm" variant="ghost" disabled={isDefaultCopy}
                  onClick={() => { setSubject(DEFAULT_DRAFT_SUBJECT); setBody(DEFAULT_DRAFT_BODY); }}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset to default
                </Button>
              </div>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              <Label className="text-xs text-muted-foreground">Message</Label>
              <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-xs" />
            </div>

            {batches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No usable email addresses for this selection and audience.
              </p>
            ) : (
              <div className="rounded-lg border divide-y max-h-72 overflow-y-auto">
                {batches.map((b) => (
                  <div key={b.index} className="p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        Draft {b.index} of {batches.length}
                        {opened[b.index] && <span className="ml-2 text-xs text-muted-foreground">opened</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {b.recipients.length} BCC recipient{b.recipients.length === 1 ? '' : 's'} ·{' '}
                        {b.recipients[0]}{b.recipients.length > 1 ? ` … ${b.recipients[b.recipients.length - 1]}` : ''}
                      </p>
                    </div>
                    <Button
                      size="sm" variant="outline" className="shrink-0"
                      onClick={() => openDraft(b.index, b.gmailUrl, b.mailtoUrl)}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open draft {b.index}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
