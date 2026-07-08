import { useEffect, useMemo, useState } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, Wrench, CheckCircle2, AlertTriangle, XCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useToast } from "@/hooks/use-toast";
import { runFullScan, applyRepair, appendLog, readLog, type ScanResult, type Finding, type Severity, type RepairLogEntry } from "@/lib/healthChecks";

const LAST_SCAN_KEY = "dk_health_last_scan_v1";
const LAST_FULL_KEY = "dk_health_last_full_v1";

function statusColor(s: Severity) {
  return s === "healthy" ? "text-green-500" : s === "warning" ? "text-yellow-500" : "text-red-500";
}
function statusEmoji(s: Severity) {
  return s === "healthy" ? "🟢" : s === "warning" ? "🟡" : "🔴";
}
function SeverityIcon({ s }: { s: Severity }) {
  if (s === "healthy") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (s === "warning") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

export default function AdminPlatformHealth() {
  const { profile } = usePortalAuth();
  const { toast } = useToast();
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFull, setLastFull] = useState<string | null>(() => localStorage.getItem(LAST_FULL_KEY));
  const [search, setSearch] = useState("");
  const [log, setLog] = useState<RepairLogEntry[]>(() => readLog());
  const [repairing, setRepairing] = useState<string | null>(null);

  const doScan = async (full: boolean) => {
    setLoading(true);
    try {
      const r = await runFullScan();
      setScan(r);
      localStorage.setItem(LAST_SCAN_KEY, r.scannedAt);
      if (full) {
        localStorage.setItem(LAST_FULL_KEY, r.scannedAt);
        setLastFull(r.scannedAt);
      }
      if (full) toast({ title: "Health scan complete", description: `${r.passed} healthy · ${r.warnings} warnings · ${r.failures} critical` });
    } catch (e: any) {
      toast({ title: "Scan failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    doScan(false);
    const t = setInterval(() => doScan(false), 15 * 60 * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRepair = async (f: Finding) => {
    if (!f.repairAction) return;
    setRepairing(f.id);
    const res = await applyRepair(f.repairAction);
    const entry: RepairLogEntry = {
      ts: new Date().toISOString(),
      admin: profile?.full_name || profile?.email || "admin",
      action: f.repairAction.kind,
      target: f.sessionId || f.reportId || f.studentId || "-",
      result: res.ok ? "success" : `error: ${res.message}`,
    };
    appendLog(entry);
    setLog(readLog());
    toast({ title: res.ok ? "Repair applied" : "Repair failed", description: res.message, variant: res.ok ? "default" : "destructive" });
    setRepairing(null);
    if (res.ok) doScan(false);
  };

  const filtered = useMemo(() => {
    if (!scan) return null;
    if (!search.trim()) return scan;
    const q = search.toLowerCase();
    return {
      ...scan,
      categories: scan.categories.map((c) => ({
        ...c,
        findings: c.findings.filter((f) =>
          [f.description, f.category, f.studentName, f.sessionId, f.reportId, f.studentId, f.suggestedFix, f.date]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
        ),
      })),
    };
  }, [scan, search]);

  return (
    <PortalLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Platform Health</h1>
            <p className="text-sm text-muted-foreground">Continuous validation of every major feature — safe read-only diagnostics with optional one-click repairs.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => doScan(true)} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Run Full Health Scan
            </Button>
          </div>
        </div>

        {/* Overall */}
        <Card>
          <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-5xl font-bold flex items-center gap-3">
                <span>{scan ? statusEmoji(scan.overallStatus) : "⏳"}</span>
                <span>{scan ? `${scan.overallScore}%` : "—"}</span>
                <span className={`text-lg ${scan ? statusColor(scan.overallStatus) : ""}`}>
                  {scan?.overallStatus === "healthy" ? "Healthy" : scan?.overallStatus === "warning" ? "Warnings" : scan?.overallStatus === "critical" ? "Critical" : "Scanning…"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Last scan: {scan ? new Date(scan.scannedAt).toLocaleString() : "—"} · Last full scan: {lastFull ? new Date(lastFull).toLocaleString() : "never"}
              </div>
            </div>
            {scan && (
              <div className="flex gap-6 text-sm">
                <div><div className="text-2xl font-bold text-green-500">{scan.passed}</div><div className="text-muted-foreground">Passed</div></div>
                <div><div className="text-2xl font-bold text-yellow-500">{scan.warnings}</div><div className="text-muted-foreground">Warnings</div></div>
                <div><div className="text-2xl font-bold text-red-500">{scan.failures}</div><div className="text-muted-foreground">Critical</div></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Input placeholder="Search issues by student, session, date, type…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />

        {/* Categories */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(filtered?.categories ?? []).map((c) => (
            <Card key={c.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2"><SeverityIcon s={c.status} /> {c.label}</span>
                  <Badge variant={c.status === "healthy" ? "secondary" : c.status === "warning" ? "outline" : "destructive"}>
                    {c.status === "healthy" ? "Healthy" : c.status === "warning" ? "Warning" : "Critical"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs text-muted-foreground mb-2">{c.checked} records checked · {c.findings.length} issue(s)</div>
                {c.findings.length === 0 ? (
                  <div className="text-sm text-muted-foreground">All clear.</div>
                ) : (
                  <ScrollArea className="h-64 pr-2">
                    <div className="space-y-2">
                      {c.findings.map((f) => (
                        <div key={f.id} className="border rounded-md p-2 space-y-1 bg-card/50">
                          <div className="flex items-center gap-2">
                            <SeverityIcon s={f.severity} />
                            <span className="text-sm font-medium">{f.description}</span>
                          </div>
                          {(f.studentName || f.date || f.sessionId || f.reportId) && (
                            <div className="text-xs text-muted-foreground">
                              {f.studentName && <>Student: <b>{f.studentName}</b></>}
                              {f.date && <> · {new Date(f.date).toLocaleDateString()}</>}
                              {f.sessionId && <> · Session {f.sessionId.slice(0, 8)}</>}
                              {f.reportId && <> · Report {f.reportId.slice(0, 8)}</>}
                            </div>
                          )}
                          {f.suggestedFix && <div className="text-xs italic text-muted-foreground">Fix: {f.suggestedFix}</div>}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {f.openLinks?.map((l) => (
                              <Button key={l.href} asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                                <Link to={l.href}><ExternalLink className="h-3 w-3 mr-1" />{l.label}</Link>
                              </Button>
                            ))}
                            {f.repairAction && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                disabled={repairing === f.id}
                                onClick={() => {
                                  if (confirm(`Apply repair: ${f.suggestedFix}?`)) handleRepair(f);
                                }}
                              >
                                {repairing === f.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wrench className="h-3 w-3 mr-1" />}
                                One-click Repair
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
          ))}
        </div>

        {/* Repair log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Repair & Alert History</CardTitle>
          </CardHeader>
          <CardContent>
            {log.length === 0 ? (
              <div className="text-sm text-muted-foreground">No repairs logged yet.</div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-1 text-xs font-mono">
                  {log.map((l, i) => (
                    <div key={i} className="flex gap-3 border-b py-1">
                      <span className="text-muted-foreground">{new Date(l.ts).toLocaleString()}</span>
                      <span>{l.admin}</span>
                      <span>{l.action}</span>
                      <span className="text-muted-foreground">{l.target}</span>
                      <span className={l.result.startsWith("success") ? "text-green-500" : "text-red-500"}>{l.result}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
