import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";

type Role = "student" | "instructor" | "admin" | "staff" | null | undefined;

interface Props {
  userId: string;
  role: Role;
}

const ALL_PREFS: Record<string, { label: string; desc: string; roles: Array<Exclude<Role, null | undefined>> }> = {
  lesson_scheduled: {
    label: "New scheduled lesson",
    desc: "Email me when a new lesson is scheduled.",
    roles: ["student", "instructor", "admin", "staff"],
  },
  lesson_cancelled: {
    label: "Lesson cancellations",
    desc: "Email me when a lesson I'm involved with is cancelled (including when a student cancels).",
    roles: ["student", "instructor", "admin", "staff"],
  },
  lesson_reminder: {
    label: "Upcoming lesson reminders",
    desc: "Email me 24 hours and 1 hour before my next scheduled lesson.",
    roles: ["student"],
  },
  report_card: {
    label: "Report card submitted",
    desc: "Email me when an instructor submits a new report card.",
    roles: ["student"],
  },
  intake_status: {
    label: "Intake status updates",
    desc: "Email me when my intake is set up or approved.",
    roles: ["student"],
  },
};

const DEFAULT_PREFS = Object.fromEntries(Object.keys(ALL_PREFS).map(k => [k, true]));

export function NotificationPreferences({ userId, role }: Props) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("email_prefs").eq("id", userId).maybeSingle();
      if (data?.email_prefs) setPrefs({ ...DEFAULT_PREFS, ...(data.email_prefs as any) });
      setLoading(false);
    })();
  }, [userId]);

  const update = async (key: string, val: boolean) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ email_prefs: next }).eq("id", userId);
    setSaving(false);
    if (error) toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
  };

  const visible = Object.entries(ALL_PREFS).filter(([_, v]) => !role || v.roles.includes(role as any));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Email notifications</CardTitle>
        <CardDescription>Choose which emails you want to receive. You can change this anytime.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          visible.map(([key, v]) => (
            <div key={key} className="flex items-start justify-between gap-4 py-1">
              <div className="flex-1">
                <Label htmlFor={`pref-${key}`} className="font-medium">{v.label}</Label>
                <p className="text-sm text-muted-foreground">{v.desc}</p>
              </div>
              <Switch id={`pref-${key}`} checked={!!prefs[key]} onCheckedChange={(c) => update(key, c)} disabled={saving} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
