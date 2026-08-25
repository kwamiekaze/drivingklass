import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  ACCEPTED_EXTENSIONS, buildErrorReportCsv, downloadCsv, parseLeadFile, type ParsedFile,
} from '@/lib/leadFileParse';
import { emptyCounts, type ImportCounts, type PlannedRow } from '@/lib/leadImport';
import { Download, FileUp, Loader2, Upload } from 'lucide-react';

const CHUNK = 400;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
}

const mergeCounts = (a: ImportCounts, b: ImportCounts): ImportCounts => ({
  total: a.total + b.total,
  new: a.new + b.new,
  updated: a.updated + b.updated,
  unchanged: a.unchanged + b.unchanged,
  duplicate: a.duplicate + b.duplicate,
  invalid: a.invalid + b.invalid,
  ambiguous: a.ambiguous + b.ambiguous,
});

async function callImport(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-import-leads', { body });
  if (error) {
    let detail = error.message;
    try {
      const ctx = (error as unknown as { context?: Response }).context;
      if (ctx) detail = await ctx.text();
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return data as { counts: ImportCounts; rows: PlannedRow[] };
}

export function LeadImportDialog({ open, onOpenChange, onImported }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [importSource, setImportSource] = useState('');
  const [busy, setBusy] = useState<'parse' | 'preview' | 'commit' | null>(null);
  const [progress, setProgress] = useState('');
  const [counts, setCounts] = useState<ImportCounts | null>(null);
  const [rows, setRows] = useState<PlannedRow[]>([]);
  const [committed, setCommitted] = useState(false);

  const reset = () => {
    setParsed(null); setCounts(null); setRows([]); setCommitted(false);
    setProgress(''); setImportSource('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = async (file: File) => {
    setBusy('parse');
    setCounts(null); setRows([]); setCommitted(false);
    try {
      const result = await parseLeadFile(file);
      if (!result.rows.length) throw new Error('No data rows found in that file.');
      if (!result.mappedFields.length) throw new Error('No recognizable column headers found.');
      setParsed(result);
      if (!importSource) setImportSource(file.name.replace(/\.[^.]+$/, ''));
    } catch (e) {
      toast({ title: 'Could not read file', description: (e as Error).message, variant: 'destructive' });
      setParsed(null);
    } finally {
      setBusy(null);
    }
  };

  const run = async (mode: 'dry_run' | 'commit') => {
    if (!parsed) return;
    setBusy(mode === 'commit' ? 'commit' : 'preview');
    try {
      let agg = emptyCounts();
      const allRows: PlannedRow[] = [];
      for (let offset = 0; offset < parsed.rows.length; offset += CHUNK) {
        const slice = parsed.rows.slice(offset, offset + CHUNK);
        setProgress(`${mode === 'commit' ? 'Importing' : 'Checking'} rows ${offset + 1}–${offset + slice.length} of ${parsed.rows.length}…`);
        const res = await callImport({
          mode,
          rows: slice,
          import_source: importSource.trim() || undefined,
          index_offset: offset,
        });
        agg = mergeCounts(agg, res.counts);
        allRows.push(...res.rows);
      }
      setCounts(agg);
      setRows(allRows);
      setProgress('');
      if (mode === 'commit') {
        setCommitted(true);
        toast({ title: 'Import complete', description: `${agg.new} new · ${agg.updated} updated · ${agg.unchanged} unchanged` });
        onImported();
      }
    } catch (e) {
      setProgress('');
      toast({ title: mode === 'commit' ? 'Import failed' : 'Preview failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const problemRows = rows.filter((r) => r.errors.length || r.warnings.length);

  const chips: Array<[string, number, string]> = counts ? [
    ['new', counts.new, 'bg-green-500/10 text-green-700 dark:text-green-400'],
    ['updated', counts.updated, 'bg-blue-500/10 text-blue-700 dark:text-blue-400'],
    ['unchanged', counts.unchanged, ''],
    ['duplicates skipped', counts.duplicate, 'bg-amber-500/10 text-amber-700 dark:text-amber-400'],
    ['invalid', counts.invalid, 'bg-red-500/10 text-red-700 dark:text-red-400'],
    ['ambiguous', counts.ambiguous, 'bg-red-500/10 text-red-700 dark:text-red-400'],
  ] : [];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileUp className="h-4 w-4 text-primary" /> Import leads</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file. Nothing is written until you review the preview and confirm.
            Imports are idempotent — re-running the same file updates instead of duplicating.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">File</Label>
            <Input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(',')}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
            />
          </div>

          <div>
            <Label className="text-xs">Import source label</Label>
            <Input value={importSource} onChange={(e) => setImportSource(e.target.value)} placeholder="e.g. DriveScout" />
          </div>

          {busy === 'parse' && (
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Reading file…</p>
          )}

          {parsed && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-xs">
              <p className="font-medium text-sm">{parsed.fileName} · {parsed.rows.length} data rows</p>
              <p className="text-muted-foreground">Mapped columns: {parsed.mappedFields.join(', ') || 'none'}</p>
              {parsed.unmappedHeaders.length > 0 && (
                <p className="text-amber-600 dark:text-amber-400">
                  Ignored columns: {parsed.unmappedHeaders.join(', ')}
                </p>
              )}
            </div>
          )}

          {progress && (
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {progress}</p>
          )}

          {counts && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {chips.map(([label, value, cls]) => (
                  <Badge key={label} variant="outline" className={cls}>{value} {label}</Badge>
                ))}
              </div>
              {problemRows.length > 0 && (
                <div className="rounded-lg border max-h-64 overflow-y-auto divide-y text-xs">
                  {problemRows.slice(0, 200).map((r) => (
                    <div key={r.row_number} className="p-2">
                      <span className="font-mono text-[10px] mr-2">row {r.row_number}</span>
                      <span className="font-medium">{r.label}</span>
                      <span className="ml-2 text-muted-foreground">({r.action})</span>
                      {r.errors.map((m) => <p key={m} className="text-destructive">{m}</p>)}
                      {r.warnings.map((m) => <p key={m} className="text-amber-600 dark:text-amber-400">{m}</p>)}
                    </div>
                  ))}
                </div>
              )}
              {problemRows.length > 0 && (
                <Button size="sm" variant="outline"
                  onClick={() => downloadCsv(`lead-import-report-${Date.now()}.csv`, buildErrorReportCsv(rows))}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Download error report
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>Close</Button>
          <Button variant="outline" disabled={!parsed || !!busy} onClick={() => run('dry_run')}>
            {busy === 'preview' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
            Preview (no changes)
          </Button>
          <Button disabled={!counts || !!busy || committed || (counts.new + counts.updated === 0)} onClick={() => run('commit')}>
            {busy === 'commit' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
            Import {counts ? counts.new + counts.updated : 0} rows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
