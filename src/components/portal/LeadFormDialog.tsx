import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { normalizeDate, normalizeEmail, normalizePhone, normalizeText } from '@/lib/leadImport';
import type { ImportedLeadRow } from '@/types/leads';
import { Loader2, Save } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: ImportedLeadRow | null; // null = create
  onSaved: () => void;
}

type FormState = {
  student_first_name: string;
  student_last_name: string;
  phone: string;
  email: string;
  guardian_first_name: string;
  guardian_last_name: string;
  guardian_phone: string;
  guardian_email: string;
  start_date: string;
  source_page: string;
  source_index: string;
  import_source: string;
  import_key: string;
  source_status: string;
  source_location: string;
  source_zone: string;
  source_account_created_on: string;
};

const EMPTY: FormState = {
  student_first_name: '', student_last_name: '', phone: '', email: '',
  guardian_first_name: '', guardian_last_name: '', guardian_phone: '', guardian_email: '',
  start_date: '', source_page: '', source_index: '', import_source: '', import_key: '',
  source_status: '', source_location: '', source_zone: '', source_account_created_on: '',
};

const fromLead = (l: ImportedLeadRow): FormState => ({
  student_first_name: l.student_first_name ?? '',
  student_last_name: l.student_last_name ?? '',
  phone: l.phone ?? '',
  email: l.email ?? '',
  guardian_first_name: l.guardian_first_name ?? '',
  guardian_last_name: l.guardian_last_name ?? '',
  guardian_phone: l.guardian_phone ?? '',
  guardian_email: l.guardian_email ?? '',
  start_date: l.start_date ?? '',
  source_page: l.source_page != null ? String(l.source_page) : '',
  source_index: l.source_index != null ? String(l.source_index) : '',
  import_source: l.import_source ?? '',
  import_key: l.import_key ?? '',
  source_status: l.source_status ?? '',
  source_location: l.source_location ?? '',
  source_zone: l.source_zone ?? '',
  source_account_created_on: l.source_account_created_on ?? '',
});

export function LeadFormDialog({ open, onOpenChange, lead, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setForm(lead ? fromLead(lead) : EMPTY); setErrors([]); }
  }, [open, lead]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    const problems: string[] = [];
    const first = normalizeText(form.student_first_name);
    const last = normalizeText(form.student_last_name);
    if (!first && !last) problems.push('A student first or last name is required.');

    const start = normalizeDate(form.start_date);
    if (!start.value || !start.valid) problems.push('A valid source start date is required.');

    const email = normalizeEmail(form.email);
    if (!email.valid) problems.push('Student email is not a valid address.');
    const gEmail = normalizeEmail(form.guardian_email);
    if (!gEmail.valid) problems.push('Guardian email is not a valid address.');

    const created = normalizeDate(form.source_account_created_on);
    if (!created.valid) problems.push('Source account-created date could not be read.');

    for (const [label, v] of [['Source page', form.source_page], ['Source index', form.source_index]] as const) {
      if (v.trim() && !/^\d+$/.test(v.trim())) problems.push(`${label} must be a whole number.`);
    }

    if (problems.length) { setErrors(problems); return; }
    setErrors([]);
    setSaving(true);


    const payload = {
      student_first_name: first || null,
      student_last_name: last || null,
      full_name: [first, last].filter(Boolean).join(' ') || null,
      phone: normalizePhone(form.phone).value || null,
      email: email.value || null,
      guardian_first_name: normalizeText(form.guardian_first_name) || null,
      guardian_last_name: normalizeText(form.guardian_last_name) || null,
      guardian_name: [normalizeText(form.guardian_first_name), normalizeText(form.guardian_last_name)]
        .filter(Boolean).join(' ') || null,
      guardian_phone: normalizePhone(form.guardian_phone).value || null,
      guardian_email: gEmail.value || null,
      start_date: start.value,
      source_page: form.source_page.trim() ? Number(form.source_page) : null,
      source_index: form.source_index.trim() ? Number(form.source_index) : null,
      import_source: normalizeText(form.import_source) || null,
      import_key: normalizeText(form.import_key) || null,
      source_status: normalizeText(form.source_status) || null,
      source_location: normalizeText(form.source_location) || null,
      source_zone: normalizeText(form.source_zone) || null,
      source_account_created_on: created.value || null,
    };

    try {
      const { error } = lead
        ? await supabase.from('leads').update(payload).eq('id', lead.id)
        : await supabase.from('leads').insert(payload);
      if (error) throw error;
      toast({ title: lead ? 'Lead updated' : 'Lead added' });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Could not save lead', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof FormState, type = 'text') => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={form[key]} onChange={set(key)} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? 'Edit lead' : 'Add lead'}</DialogTitle>
          <DialogDescription>Admin only. Student name and start date are required.</DialogDescription>
        </DialogHeader>

        {errors.length > 0 && (
          <ul className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive list-disc pl-6 space-y-1">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Student</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {field('First name', 'student_first_name')}
              {field('Last name', 'student_last_name')}
              {field('Phone', 'phone')}
              {field('Email', 'email')}
              {field('Start date', 'start_date', 'date')}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Guardian</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {field('First name', 'guardian_first_name')}
              {field('Last name', 'guardian_last_name')}
              {field('Phone', 'guardian_phone')}
              {field('Email', 'guardian_email')}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Source metadata</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {field('Import source', 'import_source')}
              {field('Import key', 'import_key')}
              {field('Source status', 'source_status')}
              {field('Source location', 'source_location')}
              {field('Source zone', 'source_zone')}
              {field('Account created on', 'source_account_created_on', 'date')}
              {field('Source page', 'source_page')}
              {field('Source index', 'source_index')}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            {lead ? 'Save changes' : 'Add lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
