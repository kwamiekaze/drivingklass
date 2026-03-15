import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Loader2, Search, MessageSquare, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

interface FeedbackEntry {
  id: string;
  report_card_id: string;
  session_id: string | null;
  student_id: string | null;
  instructor_id: string | null;
  rating_value: number;
  feedback_text: string | null;
  submitted_by_role: string | null;
  submitted_by_name: string | null;
  is_public_view: boolean | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

interface ReportCardInfo {
  id: string;
  student_id: string;
  instructor_id: string;
  session_id: string;
  created_at: string;
}

export default function AdminFeedback() {
  const { role } = usePortalAuth();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [ratings, setRatings] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [starFilter, setStarFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [feedbackFilter, setFeedbackFilter] = useState("all");

  // Profile name cache
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all ratings
        let query = supabase
          .from("report_card_ratings" as any)
          .select("id, report_card_id, session_id, student_id, instructor_id, rating_value, feedback_text, submitted_by_role, submitted_by_name, is_public_view, is_edited, created_at, updated_at")
          .order("created_at", { ascending: false });

        // Instructors only see their own report cards' ratings
        if (role === "instructor") {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Get report card IDs for this instructor
            const { data: rcData } = await supabase
              .from("report_cards")
              .select("id")
              .eq("instructor_id", user.id);
            const rcIds = (rcData || []).map((r: any) => r.id);
            if (rcIds.length === 0) {
              setRatings([]);
              setLoading(false);
              return;
            }
            query = query.in("report_card_id", rcIds);
          }
        }

        const { data, error } = await query;
        if (error) throw error;
        setRatings((data || []) as FeedbackEntry[]);

        // Gather unique student/instructor IDs to resolve names
        const ids = new Set<string>();
        (data || []).forEach((r: any) => {
          if (r.student_id) ids.add(r.student_id);
          if (r.instructor_id) ids.add(r.instructor_id);
        });
        if (ids.size > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, first_name, last_name, email")
            .in("id", Array.from(ids));
          const nameMap: Record<string, string> = {};
          (profiles || []).forEach((p: any) => {
            nameMap[p.id] = p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email || "Unknown";
          });
          setProfileNames(nameMap);
        }
      } catch (err) {
        console.error("Failed to load feedback:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [role]);

  const filtered = useMemo(() => {
    let list = [...ratings];

    // Star filter
    if (starFilter === "1-2") list = list.filter((r) => r.rating_value <= 2);
    else if (starFilter === "3-4") list = list.filter((r) => r.rating_value >= 3 && r.rating_value <= 4);
    else if (starFilter === "5") list = list.filter((r) => r.rating_value === 5);

    // Feedback filter
    if (feedbackFilter === "with") list = list.filter((r) => r.feedback_text);
    else if (feedbackFilter === "without") list = list.filter((r) => !r.feedback_text);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => {
        const studentName = r.student_id ? (profileNames[r.student_id] || "").toLowerCase() : "";
        const instructorName = r.instructor_id ? (profileNames[r.instructor_id] || "").toLowerCase() : "";
        const submitterName = (r.submitted_by_name || "").toLowerCase();
        const feedbackTxt = (r.feedback_text || "").toLowerCase();
        return studentName.includes(q) || instructorName.includes(q) || submitterName.includes(q) || feedbackTxt.includes(q);
      });
    }

    // Sort
    if (sortOrder === "oldest") list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return list;
  }, [ratings, starFilter, feedbackFilter, searchQuery, sortOrder, profileNames]);

  const getRatingAccent = (val: number) => {
    if (val <= 2) return "border-destructive/30 bg-destructive/5";
    if (val <= 4) return "border-primary/20 bg-primary/5";
    return "border-green-500/30 bg-green-500/5";
  };

  return (
    <PortalLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Ratings & Feedback
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            All student and viewer ratings across report cards.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or feedback…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <Select value={starFilter} onValueChange={setStarFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Stars" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stars</SelectItem>
              <SelectItem value="1-2">1–2 Stars</SelectItem>
              <SelectItem value="3-4">3–4 Stars</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
            </SelectContent>
          </Select>
          <Select value={feedbackFilter} onValueChange={setFeedbackFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Feedback" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="with">With Comment</SelectItem>
              <SelectItem value="without">No Comment</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="portal-card">
            <CardContent className="py-12 text-center">
              <Star className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">No ratings found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((entry) => {
              const studentName = entry.student_id ? profileNames[entry.student_id] : null;
              const instructorName = entry.instructor_id ? profileNames[entry.instructor_id] : null;
              return (
                <Card
                  key={entry.id}
                  className={cn("border transition-all hover:shadow-md", getRatingAccent(entry.rating_value))}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      {/* Stars + Meta */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={cn(
                                "h-4 w-4",
                                s <= entry.rating_value ? "fill-primary text-primary" : "text-muted-foreground/20"
                              )}
                            />
                          ))}
                          <span className="ml-1.5 text-sm font-semibold">{entry.rating_value}/5</span>
                          {entry.is_edited && (
                            <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1.5">Edited</Badge>
                          )}
                          {entry.rating_value === 5 && (
                            <Badge className="ml-2 text-[10px] py-0 px-1.5 bg-green-500/10 text-green-600 border-green-500/20">5 Stars</Badge>
                          )}
                          {entry.rating_value <= 2 && (
                            <Badge variant="destructive" className="ml-2 text-[10px] py-0 px-1.5">Needs Attention</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {entry.submitted_by_name && <span>By: {entry.submitted_by_name}</span>}
                          {!entry.submitted_by_name && entry.is_public_view && <span>By: Public Viewer</span>}
                          {studentName && <span>Student: {studentName}</span>}
                          {instructorName && <span>Instructor: {instructorName}</span>}
                          <span>{format(parseISO(entry.created_at), "MMM d, yyyy h:mm a")}</span>
                          <span className="capitalize">{entry.submitted_by_role || "unknown"}</span>
                        </div>
                      </div>

                      {/* View button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/report-cards/${entry.report_card_id}#feedback`)}
                        className="gap-1 shrink-0 text-xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Report
                      </Button>
                    </div>

                    {entry.feedback_text ? (
                      <p className="mt-3 text-sm text-foreground/80 whitespace-pre-wrap line-clamp-3">{entry.feedback_text}</p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground/50 italic">No written feedback</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
