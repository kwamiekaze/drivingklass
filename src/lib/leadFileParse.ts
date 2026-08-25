// Browser-side file parsing for the admin lead import.
// Uses real parsers (PapaParse for CSV/TSV, SheetJS for XLSX) — never ad-hoc splitting.

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { mapHeaders, type CanonicalField, type RawRow } from '@/lib/leadImport';

export interface ParsedFile {
  fileName: string;
  headers: string[];
  mappedFields: CanonicalField[];
  unmappedHeaders: string[];
  rows: RawRow[];
}

export const ACCEPTED_EXTENSIONS = ['.csv', '.tsv', '.txt', '.xlsx', '.xls'];

function buildRows(matrix: unknown[][], fileName: string): ParsedFile {
  const headerRow = (matrix[0] ?? []).map((h) => String(h ?? ''));
  const { map, unmapped } = mapHeaders(headerRow);
  const rows: RawRow[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const cells = matrix[i] ?? [];
    const values: Record<string, unknown> = {};
    let hasValue = false;
    for (const [idxStr, field] of Object.entries(map)) {
      const cell = cells[Number(idxStr)];
      values[field] = cell;
      if (cell !== undefined && cell !== null && String(cell).trim() !== '') hasValue = true;
    }
    if (!hasValue) continue; // skip blank lines, keep uploaded order otherwise
    rows.push({ row_number: rows.length + 1, values });
  }

  return {
    fileName,
    headers: headerRow,
    mappedFields: Object.values(map),
    unmappedHeaders: unmapped,
    rows,
  };
}

export async function parseLeadFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error('The workbook has no sheets.');
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: '',
blankrows: false,
    } as XLSX.Sheet2JSONOpts);
    return buildRows(matrix as unknown[][], file.name);
  }

  const text = await file.text();
  const result = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' });
  if (result.errors.length && !result.data.length) {
    throw new Error(result.errors[0].message);
  }
  return buildRows(result.data as unknown[][], file.name);
}

/** Build a downloadable CSV error report from the dry-run/commit result rows. */
export function buildErrorReportCsv(
  rows: Array<{ row_number: number; label: string; action: string; errors: string[]; warnings: string[] }>,
): string {
  const problem = rows.filter((r) => r.errors.length || r.warnings.length || r.action === 'invalid'
    || r.action === 'duplicate' || r.action === 'ambiguous');
  return Papa.unparse({
    fields: ['row_number', 'lead', 'outcome', 'errors', 'warnings'],
    data: problem.map((r) => [r.row_number, r.label, r.action, r.errors.join(' | '), r.warnings.join(' | ')]),
  });
}

export function downloadCsv(fileName: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
