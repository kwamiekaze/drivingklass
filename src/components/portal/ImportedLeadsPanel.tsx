import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { buildRecipientList, isValidEmail, type Audience } from '@/lib/leadRecipients';
import { CampaignComposer, CampaignHistoryPanel } from '@/components/portal/CampaignComposer';
import {
  Loader2, Search, ChevronLeft, ChevronRight, Mail, Phone, Copy, Users, ArrowUpDown, Sparkles, ShieldCheck,
} from 'lucide-react';

export interface ImportedLeadRow {
  id: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  student_first_name: string | null;
  student_last_name: string | null;
  guardian_name: string | null;
  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  start_date: string | null;
  source_page: number | null;
  source_index: number | null;
  import_source: string | null;
  lead_status: string | null;
  total_count: number;
}

type SortKey = 'source_index' | 'start_date' | 'student_name';
type SourceFilter = 'all' | 'imported' | 'manual';

const PAGE_SIZE = 50;

export function ImportedLeadsPanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ImportedLeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<SourceFilter>('imported');
  const [sort, setSort] = useState<SortKey>('source_index');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Record<string, ImportedLeadRow>>({});
  const [audience, setAudience] = useState<Audience>('both');
  const [selectingAll, setSelectingAll] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerLeadIds, setComposerLeadIds] = useState<string[]>([]);
  const [consent, setConsent] = useState<Record<string, string>>({});
  const [consentBusy, setConsentBusy] = useState(false);

  const loadConsent = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    const { data } = await supabase.from('leads').select('id, email_consent_status').in('id', ids);
    if (data) {
      setConsent((prev) => ({
        ...prev,
        ...Object.fromEntries(data.map((r) => [r.id, r.email_consent_status || 'unknown'])),
      }));
    }
  }, []);

  const setConsentFor = async (ids: string[], status: 'granted' | 'revoked' | 'unknown') => {
    setConsentBusy(true);
    try {
      const { error } = await supabase.rpc('admin_set_lead_consent', {
        p_lead_ids: ids,
        p_status: status,
        p_source: 'admin_bulk_action',
      });
      if (error) throw error;
      setConsent((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, status])) }));
      toast({ title: `Consent set to "${status}" for ${ids.length} lead${ids.length === 1 ? '' : 's'}` });
    } catch (e) {
      toast({ title: 'Could not update consent', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setConsentBusy(false);
    }
  };

  const openComposer = (ids: string[]) => {
    if (!ids.length) {
      toast({ title: 'Select at least one lead first', variant: 'destructive' });
      return;
    }
    setComposerLeadIds(ids);
    setComposerOpen(true);
  };


  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchPage = useCallback(async (opts?: { limit?: number; offset?: number; silent?: boolean }) => {
    const { data, error } = await supabase.rpc('admin_search_leads', {
      p_search: search.trim() || null,
      p_source: source === 'all' ? null : source,
      p_sort: sort,
      p_dir: dir,
      p_limit: opts?.limit ?? PAGE_SIZE,
      p_offset: opts?.offset ?? page * PAGE_SIZE,
    });
    if (error) throw error;
    return (data || []) as unknown as ImportedLeadRow[];
  }, [search, source, sort, dir, page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPage()
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setTotal(data.length ? Number(data[0].total_count) : 0);
        void loadConsent(data.map((r) => r.id));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        toast({ title: 'Could not load leads', description: (e as Error).message, variant: 'destructive' });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchPage, toast, loadConsent]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedRows = useMemo(() => Object.values(selected), [selected]);
  const recipients = useMemo(() => buildRecipientList(selectedRows, audience), [selectedRows, audience]);

  const toggleRow = (row: ImportedLeadRow) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[row.id]) delete next[row.id]; else next[row.id] = row;
      return next;
    });
  };

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected[r.id]);
  const togglePage = () => {
    setSelected((prev) => {
      const next = { ...prev };
      if (allOnPageSelected) rows.forEach((r) => delete next[r.id]);
      else rows.forEach((r) => { next[r.id] = r; });
      return next;
    });
  };

  const selectAllFiltered = async () => {
    setSelectingAll(true);
    try {
      const collected: ImportedLeadRow[] = [];
      const limit = 200;
      for (let offset = 0; offset < total; offset += limit) {
        const chunk = await fetchPage({ limit, offset });
        collected.push(...chunk);
        if (chunk.length < limit) break;
      }
      setSelected(Object.fromEntries(collected.map((r) => [r.id, r])));
      toast({ title: `Selected ${collected.length} leads` });
    } catch (e) {
      toast({ title: 'Could not select all', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSelectingAll(false);
    }
  };

  const copyRecipients = async () => {
    if (!recipients.eligible.length) {
      toast({ title: 'No eligible email addresses', variant: 'destructive' });
      return;
    }
    try {
      await navigator.clipboard.writeText(recipients.eligible.join(', '));
      toast({ title: `Copied ${recipients.eligible.length} addresses` });
    } catch {
      toast({ title: 'Clipboard unavailable', variant: 'destructive' });
    }
  };

  const studentName = (r: ImportedLeadRow) =>
    [r.student_first_name, r.student_last_name].filter(Boolean).join(' ') || r.full_name || 'Unnamed lead';
  const guardianName = (r: ImportedLeadRow) =>
    [r.guardian_first_name, r.guardian_last_name].filter(Boolean).join(' ') || r.guardian_name || '';

  return (
    <div className="space-y-4">
      <Card className="portal-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Imported Leads
          </CardTitle>
          <CardDescription>
            Searchable, paginated view of every lead. Source order (index 1 = most recent signup) is the default sort.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search student or guardian name, email, phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select value={source} onValueChange={(v) => { setSource(v as SourceFilter); setPage(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="imported">DriveScout / All N 1 imported</SelectItem>
                <SelectItem value="manual">Manually added leads</SelectItem>
                <SelectItem value="all">All leads</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => { setSort(v as SortKey); setPage(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="source_index">Sort: source order</SelectItem>
                <SelectItem value="start_date">Sort: start date</SelectItem>
                <SelectItem value="student_name">Sort: student name</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setDir((d) => (d === 'asc' ? 'desc' : 'asc')); setPage(0); }}>
              <ArrowUpDown className="h-4 w-4 mr-1.5" />
              {dir === 'asc' ? 'Ascending' : 'Descending'}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={togglePage} disabled={!rows.length}>
              {allOnPageSelected ? 'Clear page' : 'Select page'}
            </Button>
            <Button size="sm" variant="outline" onClick={selectAllFiltered} disabled={selectingAll || !total}>
              {selectingAll && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Select all {total} filtered
            </Button>
            <Button size="sm" variant="outline" disabled={selectingAll || !total}
              onClick={async () => { await selectAllFiltered(); }}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Select all filtered for a campaign
            </Button>
            {selectedRows.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setSelected({})}>Clear selection ({selectedRows.length})</Button>
            )}
          </div>

          {selectedRows.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">Recipients from {selectedRows.length} selected lead{selectedRows.length === 1 ? '' : 's'}:</span>
                <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
                  <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Students only</SelectItem>
                    <SelectItem value="guardian">Guardians only</SelectItem>
                    <SelectItem value="both">Students + guardians</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={copyRecipients}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy addresses
                </Button>
                <Button size="sm" onClick={() => openComposer(selectedRows.map((r) => r.id))}>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Campaign composer
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Marketing consent (audited):
                </span>
                <Button size="sm" variant="outline" disabled={consentBusy}
                  onClick={() => setConsentFor(selectedRows.map((r) => r.id), 'granted')}>Mark consented</Button>
                <Button size="sm" variant="outline" disabled={consentBusy}
                  onClick={() => setConsentFor(selectedRows.map((r) => r.id), 'revoked')}>Mark revoked</Button>
                <Button size="sm" variant="ghost" disabled={consentBusy}
                  onClick={() => setConsentFor(selectedRows.map((r) => r.id), 'unknown')}>Reset to unknown</Button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">{recipients.eligible.length} addressable</Badge>
                <Badge variant="outline">{recipients.duplicates} duplicate</Badge>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">{recipients.invalid} invalid</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Import is never treated as consent — only contacts explicitly marked as consented are included in a live campaign.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="portal-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">No leads match this search.</div>
          ) : (
            <div className="divide-y">
              {rows.map((r) => {
                const gName = guardianName(r);
                return (
                  <div key={r.id} className="p-3 sm:p-4 flex items-start gap-3">
                    <Checkbox className="mt-1" checked={!!selected[r.id]} onCheckedChange={() => toggleRow(r)} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {r.source_index != null && (
                          <Badge variant="outline" className="font-mono text-[10px]">#{r.source_index}</Badge>
                        )}
                        <span className="font-medium text-sm truncate">{studentName(r)}</span>
                        {r.import_source && <Badge variant="secondary" className="text-[10px]">DriveScout / All N 1</Badge>}
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${consent[r.id] === 'granted'
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                            : consent[r.id] === 'revoked'
                              ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}
                        >
                          consent: {consent[r.id] || 'unknown'}
                        </Badge>
                        {r.start_date && <span className="text-xs text-muted-foreground">Start {r.start_date}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {r.email && <p className="truncate">Student: {r.email}{r.phone ? ` · ${r.phone}` : ''}</p>}
                        {(gName || r.guardian_email || r.guardian_phone) && (
                          <p className="truncate">
                            Guardian{gName ? ` (${gName})` : ''}: {r.guardian_email || '—'}{r.guardian_phone ? ` · ${r.guardian_phone}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                      {isValidEmail(r.email) && (
                        <Button asChild size="sm" variant="outline" className="h-8">
                          <a href={`mailto:${r.email}`} aria-label="Email student"><Mail className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Student</span></a>
                        </Button>
                      )}
                      {isValidEmail(r.guardian_email) && (
                        <Button asChild size="sm" variant="outline" className="h-8">
                          <a href={`mailto:${r.guardian_email}`} aria-label="Email guardian"><Mail className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Guardian</span></a>
                        </Button>
                      )}
                      {r.phone && (
                        <Button asChild size="sm" variant="ghost" className="h-8">
                          <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} aria-label="Call student"><Phone className="h-3.5 w-3.5" /></a>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-8" aria-label="Compose campaign for this lead"
                        onClick={() => openComposer([r.id])}>
                        <Sparkles className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {total.toLocaleString()} lead{total === 1 ? '' : 's'} · page {page + 1} of {pageCount}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button size="sm" variant="outline" disabled={page + 1 >= pageCount || loading} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CampaignHistoryPanel />

      <CampaignComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        leadIds={composerLeadIds}
        defaultAudience={audience}
      />
    </div>
  );
}
