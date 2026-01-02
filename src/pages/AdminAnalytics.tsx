import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  LogOut, 
  ArrowLeft, 
  Users, 
  Eye, 
  MousePointer, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Search,
  Download,
  RefreshCw,
  Activity,
  Globe,
  Smartphone,
  Monitor,
  Zap
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { format, subDays, startOfDay, endOfDay, differenceInSeconds } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

interface AnalyticsEvent {
  id: string;
  created_at: string;
  event_type: string;
  event_name: string | null;
  path: string;
  page_title: string | null;
  session_id: string;
  referrer: string | null;
  device_type: string;
  metadata: Json | null;
}

interface AnalyticsSession {
  session_id: string;
  created_at: string;
  last_seen_at: string;
  first_path: string;
  last_path: string;
  page_count: number;
  device_type: string;
}

interface PageStats {
  path: string;
  views_today: number;
  views_7d: number;
  views_30d: number;
  unique_visitors_30d: number;
}

interface TrafficSource {
  source: string;
  count: number;
  percentage: number;
}

type DateRange = "today" | "7d" | "30d" | "custom";

export default function AdminAnalytics() {
  const { user, isLoading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [sessions, setSessions] = useState<AnalyticsSession[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate date bounds based on selection
  const dateBounds = useMemo(() => {
    const now = new Date();
    let start: Date;
    
    switch (dateRange) {
      case "today":
        start = startOfDay(now);
        break;
      case "7d":
        start = startOfDay(subDays(now, 7));
        break;
      case "30d":
        start = startOfDay(subDays(now, 30));
        break;
      default:
        start = startOfDay(subDays(now, 7));
    }
    
    return { start, end: endOfDay(now) };
  }, [dateRange]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin, dateBounds]);

  const fetchData = async () => {
    setIsLoadingData(true);
    
    try {
      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from("analytics_events")
        .select("*")
        .gte("created_at", dateBounds.start.toISOString())
        .lte("created_at", dateBounds.end.toISOString())
        .order("created_at", { ascending: false })
        .limit(1000);

      if (eventsError) {
        console.error("Events fetch error:", eventsError);
        toast.error("Failed to load events");
      } else {
        setEvents(eventsData || []);
      }

      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("analytics_sessions")
        .select("*")
        .gte("created_at", dateBounds.start.toISOString())
        .lte("created_at", dateBounds.end.toISOString())
        .order("created_at", { ascending: false })
        .limit(500);

      if (sessionsError) {
        console.error("Sessions fetch error:", sessionsError);
        toast.error("Failed to load sessions");
      } else {
        setSessions(sessionsData || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load analytics data");
    }
    
    setIsLoadingData(false);
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const pageViews = events.filter(e => e.event_type === "page_view");
    const clickEvents = events.filter(e => e.event_type === "click");
    const uniqueSessions = new Set(events.map(e => e.session_id)).size;
    
    // Sessions with only 1 page view = bounce
    const sessionPageCounts = events.reduce((acc, e) => {
      if (e.event_type === "page_view") {
        acc[e.session_id] = (acc[e.session_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const bouncedSessions = Object.values(sessionPageCounts).filter(count => count === 1).length;
    const bounceRate = uniqueSessions > 0 ? (bouncedSessions / uniqueSessions) * 100 : 0;
    
    const avgPagesPerSession = uniqueSessions > 0 ? pageViews.length / uniqueSessions : 0;
    
    // Avg session duration from sessions table
    const sessionsWithDuration = sessions.filter(s => s.last_seen_at && s.created_at);
    const totalDuration = sessionsWithDuration.reduce((sum, s) => {
      return sum + differenceInSeconds(new Date(s.last_seen_at), new Date(s.created_at));
    }, 0);
    const avgSessionDuration = sessionsWithDuration.length > 0 ? totalDuration / sessionsWithDuration.length : 0;

    return {
      uniqueVisitors: uniqueSessions,
      totalSessions: sessions.length,
      totalPageViews: pageViews.length,
      totalClicks: clickEvents.length,
      bounceRate,
      avgPagesPerSession,
      avgSessionDuration,
    };
  }, [events, sessions]);

  // Page views by page
  const pageStats = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const sevenDaysAgo = startOfDay(subDays(now, 7));
    const thirtyDaysAgo = startOfDay(subDays(now, 30));

    const pageViews = events.filter(e => e.event_type === "page_view");
    const pathStats: Record<string, PageStats> = {};

    pageViews.forEach(event => {
      const eventDate = new Date(event.created_at);
      const path = event.path || "/";
      
      if (!pathStats[path]) {
        pathStats[path] = {
          path,
          views_today: 0,
          views_7d: 0,
          views_30d: 0,
          unique_visitors_30d: 0,
        };
      }

      if (eventDate >= today) pathStats[path].views_today++;
      if (eventDate >= sevenDaysAgo) pathStats[path].views_7d++;
      if (eventDate >= thirtyDaysAgo) pathStats[path].views_30d++;
    });

    // Calculate unique visitors per page (30d)
    const uniqueVisitorsByPath: Record<string, Set<string>> = {};
    pageViews.forEach(event => {
      const path = event.path || "/";
      if (!uniqueVisitorsByPath[path]) uniqueVisitorsByPath[path] = new Set();
      uniqueVisitorsByPath[path].add(event.session_id);
    });

    Object.keys(pathStats).forEach(path => {
      pathStats[path].unique_visitors_30d = uniqueVisitorsByPath[path]?.size || 0;
    });

    return Object.values(pathStats)
      .filter(p => !searchQuery || p.path.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.views_30d - a.views_30d);
  }, [events, searchQuery]);

  // Traffic sources
  const trafficSources = useMemo(() => {
    const sources: Record<string, number> = { Direct: 0, Search: 0, Social: 0, Referral: 0 };
    const referrerDomains: Record<string, number> = {};

    events.filter(e => e.event_type === "session_start").forEach(event => {
      const referrer = event.referrer;
      
      if (!referrer) {
        sources.Direct++;
      } else {
        try {
          const url = new URL(referrer);
          const domain = url.hostname;
          referrerDomains[domain] = (referrerDomains[domain] || 0) + 1;

          if (domain.includes("google") || domain.includes("bing") || domain.includes("yahoo") || domain.includes("duckduckgo")) {
            sources.Search++;
          } else if (domain.includes("facebook") || domain.includes("twitter") || domain.includes("instagram") || domain.includes("linkedin") || domain.includes("tiktok")) {
            sources.Social++;
          } else {
            sources.Referral++;
          }
        } catch {
          sources.Direct++;
        }
      }
    });

    const total = Object.values(sources).reduce((a, b) => a + b, 0);
    const sourceArray: TrafficSource[] = Object.entries(sources)
      .map(([source, count]) => ({
        source,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const topReferrers = Object.entries(referrerDomains)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    return { sources: sourceArray, topReferrers };
  }, [events]);

  // Click event breakdown
  const clickBreakdown = useMemo(() => {
    const clicks = events.filter(e => e.event_type === "click");
    const breakdown: Record<string, number> = {};

    clicks.forEach(event => {
      const name = event.event_name || "unknown";
      breakdown[name] = (breakdown[name] || 0) + 1;
    });

    return Object.entries(breakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);
  }, [events]);

  // Navigation paths
  const navigationPaths = useMemo(() => {
    const sessionPaths: Record<string, string[]> = {};
    
    events
      .filter(e => e.event_type === "page_view")
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .forEach(event => {
        if (!sessionPaths[event.session_id]) sessionPaths[event.session_id] = [];
        sessionPaths[event.session_id].push(event.path);
      });

    // Entry pages
    const entryPages: Record<string, number> = {};
    Object.values(sessionPaths).forEach(paths => {
      if (paths.length > 0) {
        entryPages[paths[0]] = (entryPages[paths[0]] || 0) + 1;
      }
    });

    // Exit pages
    const exitPages: Record<string, number> = {};
    Object.values(sessionPaths).forEach(paths => {
      if (paths.length > 0) {
        exitPages[paths[paths.length - 1]] = (exitPages[paths[paths.length - 1]] || 0) + 1;
      }
    });

    return {
      entryPages: Object.entries(entryPages).sort(([, a], [, b]) => b - a).slice(0, 10),
      exitPages: Object.entries(exitPages).sort(([, a], [, b]) => b - a).slice(0, 10),
    };
  }, [events]);

  // Device breakdown
  const deviceBreakdown = useMemo(() => {
    const devices: Record<string, number> = { mobile: 0, desktop: 0 };
    const uniqueSessions = new Set<string>();

    events.forEach(event => {
      if (!uniqueSessions.has(event.session_id)) {
        uniqueSessions.add(event.session_id);
        const type = event.device_type || "desktop";
        devices[type] = (devices[type] || 0) + 1;
      }
    });

    const total = Object.values(devices).reduce((a, b) => a + b, 0);
    return Object.entries(devices).map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }, [events]);

  // Recent activity (last 50 events)
  const recentActivity = useMemo(() => {
    return events.slice(0, 50);
  }, [events]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleTestTracking = async () => {
    try {
      const testEvent = {
        event_type: "click",
        event_name: "test_tracking",
        path: "/admin/analytics",
        page_title: "Analytics Dashboard",
        session_id: `test-${Date.now()}`,
        device_type: "desktop",
        metadata: { test: true, timestamp: new Date().toISOString() },
      };

      const { error } = await supabase.from("analytics_events").insert(testEvent);
      
      if (error) {
        toast.error("Test failed: " + error.message);
      } else {
        toast.success("Test event logged! Refresh to see it in Recent Activity.");
        fetchData();
      }
    } catch (err) {
      toast.error("Test tracking failed");
    }
  };

  const exportCSV = () => {
    const headers = ["Date", "Event Type", "Event Name", "Path", "Session ID", "Device"];
    const rows = events.map(e => [
      format(new Date(e.created_at), "yyyy-MM-dd HH:mm:ss"),
      e.event_type,
      e.event_name || "",
      e.path,
      e.session_id.substring(0, 12),
      e.device_type,
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!isAdmin && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              You don't have admin privileges to view analytics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSignOut} variant="outline" className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl md:text-2xl font-display text-gold-shimmer">
              Analytics Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <ThemeToggle />
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoadingData}>
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleTestTracking}>
              <Zap className="w-4 h-4 mr-2" />
              Test Tracking
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                Unique Visitors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{metrics.uniqueVisitors.toLocaleString()}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Activity className="w-4 h-4" />
                Sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{metrics.totalSessions.toLocaleString()}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                Page Views
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{metrics.totalPageViews.toLocaleString()}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <MousePointer className="w-4 h-4" />
                Clicks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{metrics.totalClicks.toLocaleString()}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <TrendingDown className="w-4 h-4" />
                Bounce Rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{metrics.bounceRate.toFixed(1)}%</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Avg Session
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{formatDuration(metrics.avgSessionDuration)}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed views */}
        <Tabs defaultValue="pages" className="w-full">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="clicks">Clicks</TabsTrigger>
            <TabsTrigger value="navigation">Navigation</TabsTrigger>
            <TabsTrigger value="sources">Traffic Sources</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          {/* Pages Tab */}
          <TabsContent value="pages">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle>Page Views by Page</CardTitle>
                    <CardDescription>Performance breakdown by route</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search pages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : pageStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No page view data yet
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Page</TableHead>
                          <TableHead className="text-right">Today</TableHead>
                          <TableHead className="text-right">7 Days</TableHead>
                          <TableHead className="text-right">30 Days</TableHead>
                          <TableHead className="text-right">Unique (30d)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageStats.map((page) => (
                          <TableRow key={page.path}>
                            <TableCell className="font-mono text-sm">{page.path}</TableCell>
                            <TableCell className="text-right">{page.views_today}</TableCell>
                            <TableCell className="text-right">{page.views_7d}</TableCell>
                            <TableCell className="text-right font-medium">{page.views_30d}</TableCell>
                            <TableCell className="text-right">{page.unique_visitors_30d}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clicks Tab */}
          <TabsContent value="clicks">
            <Card>
              <CardHeader>
                <CardTitle>Click Events</CardTitle>
                <CardDescription>CTA and interaction tracking</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : clickBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No click events tracked yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clickBreakdown.map(([name, count]) => (
                      <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <MousePointer className="w-4 h-4 text-primary" />
                          <span className="font-medium">{name.replace(/_/g, " ")}</span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Navigation Tab */}
          <TabsContent value="navigation">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Entry Pages</CardTitle>
                  <CardDescription>Where users land first</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingData ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  ) : navigationPaths.entryPages.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No data</div>
                  ) : (
                    <div className="space-y-2">
                      {navigationPaths.entryPages.map(([path, count], idx) => (
                        <div key={path} className="flex items-center justify-between p-2 rounded bg-muted/30">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-sm">{idx + 1}.</span>
                            <span className="font-mono text-sm">{path}</span>
                          </div>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Exit Pages</CardTitle>
                  <CardDescription>Where users leave</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingData ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  ) : navigationPaths.exitPages.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No data</div>
                  ) : (
                    <div className="space-y-2">
                      {navigationPaths.exitPages.map(([path, count], idx) => (
                        <div key={path} className="flex items-center justify-between p-2 rounded bg-muted/30">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-sm">{idx + 1}.</span>
                            <span className="font-mono text-sm">{path}</span>
                          </div>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Traffic Sources Tab */}
          <TabsContent value="sources">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Traffic Sources</CardTitle>
                  <CardDescription>Where visitors come from</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingData ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {trafficSources.sources.map((source) => (
                        <div key={source.source} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-primary" />
                              <span className="font-medium">{source.source}</span>
                            </div>
                            <span className="text-sm">
                              {source.count} ({source.percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all"
                              style={{ width: `${source.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Referrers</CardTitle>
                  <CardDescription>Specific referring domains</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingData ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  ) : trafficSources.topReferrers.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No referrer data yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {trafficSources.topReferrers.map(([domain, count]) => (
                        <div key={domain} className="flex items-center justify-between p-2 rounded bg-muted/30">
                          <span className="font-mono text-sm truncate flex-1 mr-2">{domain}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices">
            <Card>
              <CardHeader>
                <CardTitle>Device Breakdown</CardTitle>
                <CardDescription>Visitors by device type</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {deviceBreakdown.map((device) => (
                      <div 
                        key={device.type}
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                      >
                        {device.type === "mobile" ? (
                          <Smartphone className="w-8 h-8 text-primary" />
                        ) : (
                          <Monitor className="w-8 h-8 text-primary" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium capitalize">{device.type}</div>
                          <div className="text-2xl font-bold">{device.count}</div>
                          <div className="text-sm text-muted-foreground">
                            {device.percentage.toFixed(1)}% of visitors
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Last 50 events</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No activity yet. Events will appear here as visitors interact with your site.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Event</TableHead>
                          <TableHead>Path</TableHead>
                          <TableHead>Referrer</TableHead>
                          <TableHead>Device</TableHead>
                          <TableHead>Session</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentActivity.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="text-sm whitespace-nowrap">
                              {format(new Date(event.created_at), "HH:mm:ss")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={event.event_type === "page_view" ? "secondary" : "default"}>
                                {event.event_name || event.event_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{event.path}</TableCell>
                            <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                              {event.referrer ? new URL(event.referrer).hostname : "-"}
                            </TableCell>
                            <TableCell>
                              {event.device_type === "mobile" ? (
                                <Smartphone className="w-4 h-4" />
                              ) : (
                                <Monitor className="w-4 h-4" />
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {event.session_id.substring(0, 8)}...
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
