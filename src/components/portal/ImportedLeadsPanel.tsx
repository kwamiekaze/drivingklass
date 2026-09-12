import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { LeadImportDialog } from '@/components/portal/LeadImportDialog';
import { LeadFormDialog } from '@/components/portal/LeadFormDialog';
import { LeadDraftEmailDialog } from '@/components/portal/LeadDraftEmailDialog';
import type { DraftRecipientSource } from '@/lib/leadDraftEmail';
import {
  DEFAULT_FILTERS, IMPORTED_BADGE, buildSearchParams, describeFilters, filtersAreDefault,
  type LeadFilterState, type LeadSortKey, type LeadSourceFilter,
} from '@/lib/leadFilters';
import type { ImportedLeadRow } from '@/types/leads';
import {
  Loader2, Search, ChevronLeft, ChevronRight, ChevronDown, Mail, MailPlus, Phone, Users, ArrowUpDown,
  FileUp, Plus, Pencil, X,
} from 'lucide-react';

export type { ImportedLeadRow } from '@/types/leads';

type SortKey = LeadSortKey;
type SourceFilter = LeadSourceFilter;

const PAGE_SIZE = 50;
const ALL_PAGE_SIZE = 200;
const ALL_MAX_ROWS = 10000;
const ANY = '__any__';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isEmail = (v: string | null | undefined): boolean => !!v && EMAIL_RE.test(v.trim());



export function ImportedLeadsPanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ImportedLeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<LeadFilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ImportedLeadRow | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [zoneOptions, setZoneOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<string, ImportedLeadRow>>({});
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftRows, setDraftRows] = useState<DraftRecipientSource[]>([]);
  const [draftScope, setDraftScope] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);


  const patch = (p: Partial<LeadFilterState>) => { setFilters((f) => ({ ...f, ...p })); setPage(0); };

  useEffect(() => {
    const t = setTimeout(() => { patch({ search: searchInput }); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Filter choices come from the database, never from a hardcoded list.
  useEffect(() => {
    supabase.rpc('admin_lead_filter_options').then(({ data, error }) => {
      if (error || !data) return;
      const list = data as { kind: string; value: string }[];
      setStatusOptions(list.filter((o) => o.kind === 'status').map((o) => o.value));
      setZoneOptions(list.filter((o) => o.kind === 'zone').map((o) => o.value));
    });
  }, [reloadKey]);

  const fetchPage = useCallback(async () => {
    const { data, error } = await supabase.rpc(
      'admin_search_leads',
      buildSearchParams(filters, page, PAGE_SIZE),
    );

    if (error) throw error;
    return (data || []) as unknown as ImportedLeadRow[];
  }, [filters, page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPage()
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setTotal(data.length ? Number(data[0].total_count) : 0);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        toast({ title: 'Could not load leads', description: (e as Error).message, variant: 'destructive' });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchPage, toast, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);
  const resetFilters = () => { setSearchInput(''); setFilters(DEFAULT_FILTERS); setPage(0); };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeSummary = useMemo(() => describeFilters(filters), [filters]);
  const isDefault = filtersAreDefault(filters);

  // ---------------------------------------------------------------- selection
  const selectedList = useMemo(() => Object.values(selected), [selected]);
  const pageAllSelected = rows.length > 0 && rows.every((r) => selected[r.id]);

  const toggleRow = (r: ImportedLeadRow, checked: boolean) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (checked) next[r.id] = r; else delete next[r.id];
      return next;
    });

  const togglePage = (checked: boolean) =>
    setSelected((prev) => {
      const next = { ...prev };
      for (const r of rows) { if (checked) next[r.id] = r; else delete next[r.id]; }
      return next;
    });

  /** Fetch every row matching the current filters, in bounded server-side pages. */
  const fetchAllFiltered = useCallback(async (): Promise<ImportedLeadRow[]> => {
    const all: ImportedLeadRow[] = [];
    let offsetPage = 0;
    let expected = Infinity;
    while (all.length < expected && all.length < ALL_MAX_ROWS) {
      const { data, error } = await supabase.rpc(
        'admin_search_leads',
        buildSearchParams(filters, offsetPage, ALL_PAGE_SIZE),
      );
      if (error) throw error;
      const batch = (data || []) as unknown as ImportedLeadRow[];
      if (!batch.length) break;
      expected = Number(batch[0].total_count) || batch.length;
      all.push(...batch);
      offsetPage++;
    }
    return all;
  }, [filters]);

  const selectAllFiltered = async () => {
    setDraftLoading(true);
    try {
      const all = await fetchAllFiltered();
      setSelected(Object.fromEntries(all.map((r) => [r.id, r])));
      toast({ title: `${all.length.toLocaleString()} leads selected` });
    } catch (e) {
      toast({ title: 'Could not select all results', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setDraftLoading(false);
    }
  };

  const openDraftFor = (source: DraftRecipientSource[], scope: string) => {
    setDraftError(null);
    setDraftRows(source);
    setDraftScope(scope);
    setDraftOpen(true);
  };

  const studentName = (r: ImportedLeadRow) =>
    [r.student_first_name, r.student_last_name].filter(Boolean).join(' ') || r.full_name || 'Unnamed lead';
  const guardianName = (r: ImportedLeadRow) =>
    [r.guardian_first_name, r.guardian_last_name].filter(Boolean).join(' ') || r.guardian_name || '';


  const detail = (label: string, value: string | number | null | undefined) => (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs truncate">{value === null || value === undefined || value === '' ? '—' : String(value)}</p>
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-4">

      <Card className="portal-card">
        <CardHeader className="pb-3 flex-row items-start justify-between space-y-0 gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Student Leads
            </CardTitle>
            <CardDescription>
              Searchable, paginated view of every lead. Default order: newest source start date, then newest
              source account-created date, then upload order.
            </CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Import leads</span>
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Add lead</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search student or guardian name, email, phone, status, location, zone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select value={filters.source} onValueChange={(v) => patch({ source: v as SourceFilter })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="imported">Imported roster leads</SelectItem>
                <SelectItem value="manual">Manually added leads</SelectItem>
                <SelectItem value="all">All leads</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.sort} onValueChange={(v) => patch({ sort: v as SortKey })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Sort: source start date, then account-created</SelectItem>
                <SelectItem value="start_date">Sort: source start date</SelectItem>
                <SelectItem value="source_account_created_on">Sort: source account-created date</SelectItem>
                <SelectItem value="student_name">Sort: student name</SelectItem>
                <SelectItem value="source_index">Sort: upload order</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => patch({ dir: filters.dir === 'asc' ? 'desc' : 'asc' })}>
              <ArrowUpDown className="h-4 w-4 mr-1.5" />
              {filters.dir === 'asc' ? 'Ascending' : 'Descending'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Source start date from</Label>
              <Input type="date" value={filters.startFrom} onChange={(e) => patch({ startFrom: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Source start date to</Label>
              <Input type="date" value={filters.startTo} onChange={(e) => patch({ startTo: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Source status</Label>
              <Select
                value={filters.status || ANY}
                onValueChange={(v) => patch({ status: v === ANY ? '' : v })}
              >
                <SelectTrigger><SelectValue placeholder="Any status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any status</SelectItem>
                  {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Source zone</Label>
              <Select
                value={filters.zone || ANY}
                onValueChange={(v) => patch({ zone: v === ANY ? '' : v })}
              >
                <SelectTrigger><SelectValue placeholder="Any zone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any zone</SelectItem>
                  {zoneOptions.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {activeSummary.map((s) => (
              <Badge key={s} variant="outline" className="text-[11px] font-normal">{s}</Badge>
            ))}
            <Button size="sm" variant="ghost" onClick={resetFilters} disabled={isDefault}>
              <X className="h-3.5 w-3.5 mr-1.5" /> Reset filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-3">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Checkbox
            checked={pageAllSelected}
            disabled={rows.length === 0}
            onCheckedChange={(v) => togglePage(v === true)}
            aria-label="Select every lead on this page"
          />
          Select page
        </label>
        <Button size="sm" variant="outline" onClick={selectAllFiltered} disabled={draftLoading || total === 0}>
          {draftLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
          Select all {total.toLocaleString()} results
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setSelected({})} disabled={selectedList.length === 0}>
          <X className="h-3.5 w-3.5 mr-1.5" /> Clear selection
        </Button>
        <Badge variant="outline" className="text-[11px] font-normal">{selectedList.length} selected</Badge>
        <Button
          size="sm"
          className="ml-auto"
          disabled={selectedList.length === 0}
          onClick={() => openDraftFor(selectedList, `${selectedList.length} selected lead${selectedList.length === 1 ? '' : 's'}`)}
        >
          <MailPlus className="h-3.5 w-3.5 mr-1.5" /> Draft email
        </Button>
      </div>

      <Card className="portal-card">

        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">No leads match these filters.</div>
          ) : (
            <div className="divide-y">
              {rows.map((r) => {
                const gName = guardianName(r);
                return (
                  <Collapsible
                    key={r.id}
                    open={!!expanded[r.id]}
                    onOpenChange={(v) => setExpanded((p) => ({ ...p, [r.id]: v }))}
                  >
                    <div className="p-3 sm:p-4 flex items-start gap-3">
                      <Checkbox
                        className="mt-1"
                        checked={!!selected[r.id]}
                        onCheckedChange={(v) => toggleRow(r, v === true)}
                        aria-label={`Select ${studentName(r)}`}
                      />
                      <div className="min-w-0 flex-1 space-y-1">

                        <div className="flex flex-wrap items-center gap-2">
                          {r.source_index != null && (
                            <Badge variant="outline" className="font-mono text-[10px]">#{r.source_index}</Badge>
                          )}
                          <span className="font-medium text-sm truncate">{studentName(r)}</span>
                          {r.import_source && <Badge variant="secondary" className="text-[10px]">{IMPORTED_BADGE}</Badge>}
                          {r.start_date && <span className="text-xs text-muted-foreground">Source start {r.start_date}</span>}
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
                        {(isEmail(r.email) || isEmail(r.guardian_email)) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm" variant="ghost" className="h-8" aria-label="Draft email for this lead"
                                onClick={() => openDraftFor([r], studentName(r))}
                              >
                                <MailPlus className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Draft email (opens a Gmail draft, never sends)</TooltipContent>
                          </Tooltip>
                        )}
                        {isEmail(r.email) && (

                          <Button asChild size="sm" variant="outline" className="h-8">
                            <a href={`mailto:${r.email}`} aria-label="Email student"><Mail className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Student</span></a>
                          </Button>
                        )}
                        {isEmail(r.guardian_email) && (
                          <Button asChild size="sm" variant="outline" className="h-8">
                            <a href={`mailto:${r.guardian_email}`} aria-label="Email guardian"><Mail className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Guardian</span></a>
                          </Button>
                        )}
                        {r.phone && (
                          <Button asChild size="sm" variant="ghost" className="h-8">
                            <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} aria-label="Call student"><Phone className="h-3.5 w-3.5" /></a>
                          </Button>
                        )}
                        {r.guardian_phone && (
                          <Button asChild size="sm" variant="ghost" className="h-8">
                            <a href={`tel:${r.guardian_phone.replace(/[^\d+]/g, '')}`} aria-label="Call guardian"><Phone className="h-3.5 w-3.5 opacity-60" /></a>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8" aria-label="Edit lead"
                          onClick={() => { setEditing(r); setFormOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8" aria-label="Show lead details">
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded[r.id] ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <div className="px-3 pb-4 sm:px-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20">
                        {detail('Student first', r.student_first_name)}
                        {detail('Student last', r.student_last_name)}
                        {detail('Student phone', r.phone)}
                        {detail('Student email', r.email)}
                        {detail('Guardian first', r.guardian_first_name)}
                        {detail('Guardian last', r.guardian_last_name)}
                        {detail('Guardian phone', r.guardian_phone)}
                        {detail('Guardian email', r.guardian_email)}
                        {detail('Source start date', r.start_date)}
                        {detail('Source account-created date', r.source_account_created_on)}
                        {detail('Source status', r.source_status)}
                        {detail('Source location', r.source_location)}
                        {detail('Source zone', r.source_zone)}
                        {detail('Record type', r.import_source ? IMPORTED_BADGE : 'Manually added')}
                        {detail('Source page / index', [r.source_page, r.source_index].filter((v) => v != null).join(' / '))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
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

      <LeadImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={reload} />
      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} lead={editing} onSaved={reload} />
      <LeadDraftEmailDialog
        open={draftOpen}
        onOpenChange={setDraftOpen}
        rows={draftRows}
        scopeLabel={draftScope}
        loading={false}
        error={draftError}
      />
    </div>
    </TooltipProvider>
  );
}

