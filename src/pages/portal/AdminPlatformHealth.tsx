import { useEffect, useMemo, useState, useCallback } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, RefreshCw, Wrench, CheckCircle2, AlertTriangle, XCircle, ExternalLink, History } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useToast } from "@/hooks/use-toast";

type Severity = "info" | "warning" | "critical";
type Status = "healthy" | "warning" | "critical";

interface Scan {
  id: string;
  scan_type: string;
  started_at: string;
  finished_at: string | null;
  score: number | null;
  status: string;
  summary: any;
}
interface Issue {
  id: string;
  scan_id: string;
  category: string;
  severity: Severity;
  check_key: string;
  description: string;
  student_id: string | null;
  student_name: string | null;
  session_id: string | null;
  report_id: string | null;
  affected_entity_type: string | null;
  affected_entity_id: string | null;
  suggested_fix: string | null;
  fixable: boolean;
  fix_action: string | null;
  fix_payload: any;
  fixed_at: string | null;
  fixed_by: string | null;
  created_at: string;
}
interface RepairLog {
  id: string;
  issue_id: string | null;
  admin_id: string | null;
  action: string;
  result: string;
  created_at: string;
}

const CATEGORIES = ["Sessions", "Report Cards", "Road Tests", "Students", "Scheduling", "Notifications", "Live Tracker", "Database Integrity", "Public Sharing", "Route Integrity"];

function catStatus(issues: Issue[]): Status {
  if (issues.some((i) => i.severity === "critical" && !i.fixed_at)) return "critical";
  if (issues.some((i) => i.severity === "warning" && !i.fixed_at)) return "warning";
  return "healthy";
}
function statusEmoji(s: Status) { return s === "healthy" ? "🟢" : s === "warning" ? "🟡" : "🔴"; }
function statusLabel(s: Status) { return s === "healthy" ? "Healthy" : s === "warning" ? "Warnings" : "Critical"; }
function SeverityIcon({ s }: { s: Severity | Status }) {
  if (s === "healthy" || s === "info") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (s === "warning") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

function openLinksFor(i: Issue): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = [];
  if (i.session_id) links.push({ label: "Open Session", href: `/admin/schedule?session=${i.session_id}` });
  if (i.report_id) links.push({ label: "Open Report", href: `/report-cards/${i.report_id}` });
  if (i.student_id) links.push({ label: "Open Student", href: `/admin/students?student=${i.student_id}` });
  return links;
}

export default function AdminPlatformHealth() {
  const { profile, role } = usePortalAuth();
  const { toast } = useToast();
  const isAdmin = role === "admin" || role === "staff";

  const [scan, setScan] = useState<Scan | null>(null);
  const [lastFull, setLastFull] = useState<Scan | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [logs, setLogs] = useState<RepairLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [repairing, setRepairing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | Severity>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [confirmIssue, setConfirmIssue] = useState<Issue | null>(null);

  const loadLatest = useCallback(async () => {
    setLoading(true);
    try {
      const { data: scans } = await supabase.from("health_scans").select("*").eq("status", "completed").order("started_at", { ascending: false }).limit(20);
      const latest = (scans ?? [])[0] ?? null;
      const latestFull = (scans ?? []).find((s: any) => s.scan_type === "full" || s.scan_type === "manual") ?? null;
      setScan(latest as any);
      setLastFull(latestFull as any);
      if (latest) {
        const { data: iss } = await supabase.from("health_issues").select("*").eq("scan_id", (latest as any).id).order("severity", { ascending: true }).limit(2000);
        setIssues((iss ?? []) as any);
      } else {
        setIssues([]);
      }
      const { data: log } = await supabase.from("health_repair_log").select("*").order("created_at", { ascending: false }).limit(200);
      setLogs((log ?? []) as any);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isAdmin) loadLatest(); }, [isAdmin, loadLatest]);

  const runScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-health-scan", { body: { scanType: "manual" } });
      if (error) throw error;
      toast({ title: "Full scan complete", description: `Score ${(data as any)?.score ?? "—"} · ${(data as any)?.issueCount ?? 0} issues found` });
      await loadLatest();
    } catch (e: any) {
      toast({ title: "Scan failed", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const confirmAndRepair = (i: Issue) => setConfirmIssue(i);
  const doRepair = async () => {
    const i = confirmIssue;
    if (!i || !i.fix_action) { setConfirmIssue(null); return; }
    setRepairing(i.id);
    try {
      const { data, error } = await supabase.functions.invoke("fix-health-issue", { body: { issue_id: i.id, action: i.fix_action, payload: i.fix_payload ?? {} } });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error ?? "Repair failed");
      toast({ title: "Repair applied", description: (data as any).result });
      await loadLatest();
    } catch (e: any) {
      toast({ title: "Repair failed", description: e.message, variant: "destructive" });
    } finally {
      setRepairing(null);
      setConfirmIssue(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter((i) => {
      if (severityFilter !== "all" && i.severity !== severityFilter) return false;
      if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
      if (!q) return true;
      return [i.description, i.category, i.student_name, i.session_id, i.report_id, i.suggested_fix, i.check_key].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [issues, search, severityFilter, categoryFilter]);

  const byCategory = useMemo(() => {
    const m = new Map<string, Issue[]>();
    for (const c of CATEGORIES) m.set(c, []);
    for (const i of filtered) {
      if (!m.has(i.category)) m.set(i.category, []);
      m.get(i.category)!.push(i);
    }
    return m;
  }, [filtered]);

  const overallStatus: Status = scan ? (issues.some((i) => i.severity === "critical" && !i.fixed_at) ? "critical" : issues.some((i) => i.severity === "warning" && !i.fixed_at) ? "warning" : "healthy") : "healthy";
  const counts = useMemo(() => {
    const open = issues.filter((i) => !i.fixed_at);
    return {
      critical: open.filter((i) => i.severity === "critical").length,
      warning: open.filter((i) => i.severity === "warning").length,
      info: open.filter((i) => i.severity === "info").length,
      fixed: issues.filter((i) => i.fixed_at).length,
    };
  }, [issues]);

  if (!isAdmin) {
    return (
      <PortalLayout>
        <div className="p-8 text-center text-muted-foreground">Admin access required.</div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Platform Health</h1>
            <p className="text-sm text-muted-foreground">Continuous validation of every major feature — safe diagnostics with one-click repairs where non-destructive.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadLatest} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button onClick={runScan} disabled={scanning} className="gap-2">
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Run Full Health Scan
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-5xl font-bold flex items-center gap-3">
                <span>{scan ? statusEmoji(overallStatus) : "⏳"}</span>
                <span>{scan?.score ?? "—"}%</span>
                <span className="text-lg">{scan ? statusLabel(overallStatus) : "No scan yet"}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Last scan: {scan ? new Date(scan.started_at).toLocaleString() : "—"} ({scan?.scan_type ?? ""}) · Last full scan: {lastFull ? new Date(lastFull.started_at).toLocaleString() : "never"}
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              <Stat label="Critical" value={counts.critical} color="text-red-500" />
              <Stat label="Warnings" value={counts.warning} color="text-yellow-500" />
              <Stat label="Info" value={counts.info} color="text-blue-500" />
              <Stat label="Fixed" value={counts.fixed} color="text-green-500" />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col md:flex-row gap-2">
          <Input placeholder="Search by student, session, report, description…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
          <Select value={severityFilter} onValueChange={(v: any) => setSeverityFilter(v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const list = byCategory.get(cat) ?? [];
            const st = catStatus(list);
            return (
              <Card key={cat}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2"><SeverityIcon s={st} /> {cat}</span>
                    <Badge variant={st === "healthy" ? "secondary" : st === "warning" ? "outline" : "destructive"}>{statusLabel(st)}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xs text-muted-foreground mb-2">{list.length} issue(s)</div>
                  {list.length === 0 ? (
                    <div className="text-sm text-muted-foreground">All clear.</div>
                  ) : (
                    <ScrollArea className="h-72 pr-2">
                      <div className="space-y-2">
                        {list.map((i) => (
                          <div key={i.id} className={`border rounded-md p-2 space-y-1 ${i.fixed_at ? "opacity-60" : ""}`}>
                            <div className="flex items-center gap-2">
                              <SeverityIcon s={i.severity} />
                              <span className="text-sm font-medium">{i.description}</span>
                              {i.fixed_at && <Badge variant="secondary" className="ml-auto text-[10px]">Fixed</Badge>}
                            </div>
                            {(i.student_name || i.session_id || i.report_id) && (
                              <div className="text-xs text-muted-foreground">
                                {i.student_name && <>Student: <b>{i.student_name}</b></>}
                                {i.session_id && <> · Session {i.session_id.slice(0, 8)}</>}
                                {i.report_id && <> · Report {i.report_id.slice(0, 8)}</>}
                              </div>
                            )}
                            {i.suggested_fix && <div className="text-xs italic text-muted-foreground">Fix: {i.suggested_fix}</div>}
                            <div className="flex flex-wrap gap-1 pt-1">
                              {openLinksFor(i).map((l) => (
                                <Button key={l.href} asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                                  <Link to={l.href}><ExternalLink className="h-3 w-3 mr-1" />{l.label}</Link>
                                </Button>
                              ))}
                              {i.fixable && !i.fixed_at && (
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={repairing === i.id} onClick={() => confirmAndRepair(i)}>
                                  {repairing === i.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wrench className="h-3 w-3 mr-1" />}
                                  Repair
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Repair History</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-sm text-muted-foreground">No repairs logged yet.</div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-1 text-xs font-mono">
                  {logs.map((l) => (
                    <div key={l.id} className="flex flex-wrap gap-3 border-b py-1">
                      <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
                      <span>{l.action}</span>
                      <span className="text-muted-foreground truncate max-w-md">{l.result}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={!!confirmIssue} onOpenChange={(o) => !o && setConfirmIssue(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apply repair?</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmIssue?.suggested_fix ?? "This will apply an automated fix."}<br /><br />
                <span className="text-xs">Action: <b>{confirmIssue?.fix_action}</b></span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={doRepair}>Apply repair</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="text-xs text-muted-foreground text-center pt-4">
          Scanned by {profile?.full_name ?? profile?.email ?? "admin"} · Auto-scan every 15 minutes · Full scan nightly at 3 AM UTC
        </div>
      </div>
    </PortalLayout>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
  );
}
