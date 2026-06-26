import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2, Calendar, User, Send, Clock, FileText, Star, Share2, Lock, BarChart3, Mail } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Session, ReportCard, RATING_CATEGORIES, ReportCardStatus } from "@/types/portal";
import { SkillHighlightsEditor, type SkillHighlightItem } from "@/components/portal/SkillHighlightsEditor";
import { SKILL_KEYS } from "@/lib/reportCardGraphData";
import { TIME_SPLIT_CATEGORIES, TimeSplitChart, type TimeSplitEntry } from "@/components/portal/TimeSplitChart";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { getDisplayName } from "@/lib/profileUtils";
import { RoadTestResultModal } from "@/components/portal/RoadTestResultModal";
import { SessionTypeBadge } from "@/components/portal/SessionTypeBadge";
import { LatestReportSnapshot } from "@/components/portal/LatestReportSnapshot";
import { Link } from "react-router-dom";

export default function ReportCardForm() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <PortalLayout>
        <ReportCardFormContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function ReportCardFormContent() {
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = usePortalAuth();
  const { toast } = useToast();

  const sessionId = searchParams.get('session_id');
  const isEditing = !!id;

  const [session, setSession] = useState<Session | null>(null);
  const [existingCard, setExistingCard] = useState<ReportCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [draftId, setDraftId] = useState<string | null>(id || null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  const [formData, setFormData] = useState({
    transcription_summary: '',
    message_to_student: '',
    internal_message: '',
    acceleration: 5,
    braking: 5,
    left_turns: 5,
    right_turns: 5,
    speed_maintenance: 5,
    lane_maintenance: 5,
    blind_spots: 5,
    signal_usage: 5,
    changing_lanes: 5,
    following_distance: 5,
    road_sign_awareness: 5,
    distractions: 5,
    general_parking: 5,
    reverse_parking: 5,
    parallel_parking: 5,
    straight_line_backing: 5,
    turn_about: 5,
    merging: 5,
    interstate: 5,
    overall: 5,
  });

  const [highlightStrongest, setHighlightStrongest] = useState<SkillHighlightItem[]>([]);
  const [highlightMostImproved, setHighlightMostImproved] = useState<SkillHighlightItem[]>([]);
  const [highlightFocusAreas, setHighlightFocusAreas] = useState<SkillHighlightItem[]>([]);
  const [priorReports, setPriorReports] = useState<Array<Record<string, number | string | null | undefined>>>([]);
  const [previousReport, setPreviousReport] = useState<Record<string, any> | null>(null);

  // Sharing & delivery
  const [shareAccessCode, setShareAccessCode] = useState<string>("");
  const [shareShowGraph, setShareShowGraph] = useState<boolean>(false);
  const [shareSendToGuardian, setShareSendToGuardian] = useState<boolean>(false);
  const [guardianEmail, setGuardianEmail] = useState<string>("");

  // Time spent during lesson (minutes per category)
  const [timeSplitEnabled, setTimeSplitEnabled] = useState<Record<string, boolean>>({});
  const [timeSplitMinutes, setTimeSplitMinutes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isEditing && id) {
      fetchExistingCard();
    } else if (sessionId) {
      fetchSession();
    } else {
      setLoading(false);
    }
  }, [sessionId, id]);

  const fetchPriorReports = async (studentId: string, currentReportCreatedAt?: string) => {
    const selectFields = ['id', 'created_at', 'overall', 'instructor_id', 'session_id',
      'strongest_skills', 'most_improved_skills', 'focus_areas', ...SKILL_KEYS].join(', ');
    const { data } = await supabase
      .from('report_cards')
      .select(selectFields)
      .eq('student_id', studentId)
      .eq('report_card_status', 'completed')
      .order('created_at', { ascending: true });
    if (data) {
      setPriorReports(data as any[]);
      // Find the most recent completed report before the current one
      const sorted = [...data].sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const prev = sorted.find((r: any) => {
        if (id && r.id === id) return false;
        if (currentReportCreatedAt && r.created_at >= currentReportCreatedAt) return false;
        return true;
      }) || (sorted.length > 0 ? sorted.find((r: any) => r.id !== id) : null);
      setPreviousReport(prev || null);
    }
  };

  const loadHighlightsFromRecord = (record: any) => {
    const parse = (val: any): SkillHighlightItem[] => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
      return [];
    };
    setHighlightStrongest(parse(record.strongest_skills));
    setHighlightMostImproved(parse(record.most_improved_skills));
    setHighlightFocusAreas(parse(record.focus_areas));
  };

  const fetchSession = async () => {
    const { data } = await supabase
      .from('sessions')
      .select('*, student:profiles!sessions_student_id_fkey(*), instructor:profiles!sessions_instructor_id_fkey(*)')
      .eq('id', sessionId)
      .single();

    if (data) {
      // If this is a road test session, don't show driving report form
      if (data.session_type === 'testing') {
        navigate(-1);
        toast({ title: "Road test sessions use the Road Test grading flow, not the report card form.", variant: "destructive" });
        return;
      }
      setSession(data as Session);
      fetchPriorReports(data.student_id);
      // Check if there's already a draft for this session
      const { data: existingDraft } = await supabase
        .from('report_cards')
        .select('*')
        .eq('session_id', sessionId!)
        .in('report_card_status', ['draft', 'in_progress'])
        .maybeSingle();

      if (existingDraft) {
        setDraftId(existingDraft.id);
        setExistingCard(existingDraft as ReportCard);
        loadHighlightsFromRecord(existingDraft);
        setFormData({
          transcription_summary: existingDraft.transcription_summary || '',
          message_to_student: existingDraft.message_to_student || '',
          internal_message: existingDraft.internal_message || '',
          acceleration: existingDraft.acceleration || 5,
          braking: existingDraft.braking || 5,
          left_turns: existingDraft.left_turns || 5,
          right_turns: existingDraft.right_turns || 5,
          speed_maintenance: existingDraft.speed_maintenance || 5,
          lane_maintenance: existingDraft.lane_maintenance || 5,
          blind_spots: existingDraft.blind_spots || 5,
          signal_usage: existingDraft.signal_usage || 5,
          changing_lanes: existingDraft.changing_lanes || 5,
          following_distance: existingDraft.following_distance || 5,
          road_sign_awareness: existingDraft.road_sign_awareness || 5,
          distractions: existingDraft.distractions || 5,
          general_parking: existingDraft.general_parking || 5,
          reverse_parking: existingDraft.reverse_parking || 5,
          parallel_parking: existingDraft.parallel_parking || 5,
          straight_line_backing: existingDraft.straight_line_backing || 5,
          turn_about: existingDraft.turn_about || 5,
          merging: existingDraft.merging || 5,
          interstate: existingDraft.interstate || 5,
          overall: existingDraft.overall || 5,
        });
      }
    }
    setLoading(false);
  };

  const fetchExistingCard = async () => {
    const { data } = await supabase
      .from('report_cards')
      .select('*, session:sessions(*, student:profiles!sessions_student_id_fkey(*)), student:profiles!report_cards_student_id_fkey(*)')
      .eq('id', id)
      .single();

    if (data) {
      // If this report card belongs to a road test session, redirect
      if ((data.session as any)?.session_type === 'testing') {
        navigate(`/road-test-results/${(data.session as any)?.id}`, { replace: true });
        return;
      }
      setExistingCard(data as ReportCard);
      setSession(data.session as Session);
      setDraftId(data.id);
      loadHighlightsFromRecord(data);
      fetchPriorReports(data.student_id, data.created_at);
      setFormData({
        transcription_summary: data.transcription_summary || '',
        message_to_student: data.message_to_student || '',
        internal_message: data.internal_message || '',
        acceleration: data.acceleration || 5,
        braking: data.braking || 5,
        left_turns: data.left_turns || 5,
        right_turns: data.right_turns || 5,
        speed_maintenance: data.speed_maintenance || 5,
        lane_maintenance: data.lane_maintenance || 5,
        blind_spots: data.blind_spots || 5,
        signal_usage: data.signal_usage || 5,
        changing_lanes: data.changing_lanes || 5,
        following_distance: data.following_distance || 5,
        road_sign_awareness: data.road_sign_awareness || 5,
        distractions: data.distractions || 5,
        general_parking: data.general_parking || 5,
        reverse_parking: data.reverse_parking || 5,
        parallel_parking: data.parallel_parking || 5,
        straight_line_backing: data.straight_line_backing || 5,
        turn_about: data.turn_about || 5,
        merging: data.merging || 5,
        interstate: data.interstate || 5,
        overall: data.overall || 5,
      });
    }
    setLoading(false);
  };

  const handleRatingChange = (key: string, value: number[]) => {
    setFormData(prev => ({ ...prev, [key]: value[0] }));
  };

  // Auto-save logic
  const performAutoSave = useCallback(async () => {
    if (!session || !user) return;

    const serialized = JSON.stringify(formData);
    if (serialized === lastSavedRef.current) return;

    setAutoSaveStatus('saving');

    try {
      const reportDataBase = {
        ...formData,
        session_id: session.id,
        student_id: session.student_id,
        instructor_id: session.instructor_id,
        strongest_skills: JSON.parse(JSON.stringify(highlightStrongest)),
        most_improved_skills: JSON.parse(JSON.stringify(highlightMostImproved)),
        focus_areas: JSON.parse(JSON.stringify(highlightFocusAreas)),
      };

      if (draftId) {
        // Update existing draft
        const { error } = await supabase
          .from('report_cards')
          .update({ ...reportDataBase, report_card_status: 'in_progress' as string })
          .eq('id', draftId);
        if (error) throw error;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from('report_cards')
          .insert({ ...reportDataBase, report_card_status: 'draft' as string })
          .select('id')
          .single();
        if (error) throw error;
        if (data) setDraftId(data.id);
      }

      lastSavedRef.current = serialized;
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Auto-save failed:', err);
      setAutoSaveStatus('idle');
    }
  }, [formData, session, user, draftId]);

  // Debounced auto-save on form changes
  useEffect(() => {
    if (loading || !session) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [formData, loading, session, performAutoSave]);

  // Save draft manually
  const handleSaveDraft = async () => {
    setSaving(true);
    await performAutoSave();
    setSaving(false);
    toast({
      title: "Draft Saved",
      description: "Your report card draft has been saved.",
    });
  };

  // Submit report card (mark as completed)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !user) return;

    setSubmitting(true);

    try {
      const reportDataBase = {
        ...formData,
        session_id: session.id,
        student_id: session.student_id,
        instructor_id: session.instructor_id,
        report_card_status: 'completed' as string,
        submitted_at: new Date().toISOString(),
        strongest_skills: JSON.parse(JSON.stringify(highlightStrongest)),
        most_improved_skills: JSON.parse(JSON.stringify(highlightMostImproved)),
        focus_areas: JSON.parse(JSON.stringify(highlightFocusAreas)),
      };

      if (draftId) {
        const { error } = await supabase
          .from('report_cards')
          .update(reportDataBase)
          .eq('id', draftId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('report_cards')
          .insert(reportDataBase);
        if (error) throw error;
      }

      toast({
        title: "Report Card Submitted",
        description: "The report card is now visible to the student.",
      });

      navigate(-1);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report card",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Check if lesson is currently in progress
  const isLessonInProgress = session ? (
    isBefore(parseISO(session.starts_at), new Date()) && 
    isAfter(parseISO(session.ends_at), new Date())
  ) : false;

  const currentStatus: ReportCardStatus = existingCard?.report_card_status as ReportCardStatus || 'draft';
  const isCompleted = currentStatus === 'completed';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Session not found</p>
        <Button variant="link" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  // GUARD: If session is a testing session, show Road Test UI instead of driving report card
  if (session.session_type === 'testing' && !isEditing) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold theme-heading">Road Test Result</h1>
            <p className="text-muted-foreground">
              {getDisplayName(session.student, 'Student')} - {format(parseISO(session.starts_at), 'MMMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
        <RoadTestResultModal
          open={true}
          onOpenChange={(open) => { if (!open) navigate(-1); }}
          sessionId={session.id}
          studentId={session.student_id}
          instructorId={session.instructor_id}
          onSubmitted={() => navigate(-1)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold theme-heading">
              {isCompleted ? 'Edit Report Card' : draftId ? 'Continue Report' : 'New Report Card'}
            </h1>
            <ReportCardStatusBadge status={currentStatus} />
          </div>
          <p className="text-muted-foreground">
            {getDisplayName(session.student, 'Student')} - {format(parseISO(session.starts_at), 'MMMM d, yyyy h:mm a')}
          </p>
        </div>
      </div>

      {/* Lesson In Progress indicator */}
      {isLessonInProgress && (
        <Card className="border-orange-500/50 bg-orange-500/10">
          <CardContent className="p-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500 animate-pulse" />
            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Lesson In Progress</span>
          </CardContent>
        </Card>
      )}

      {/* Auto-save indicator */}
      {!isCompleted && (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          {autoSaveStatus === 'saving' && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="text-green-600 dark:text-green-400">✓ Draft Saved</span>
          )}
        </div>
      )}

      {/* Session Info */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Student</p>
                <p className="font-medium">{getDisplayName(session.student, 'Student')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">{format(parseISO(session.starts_at), 'MMM d, yyyy')}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="font-medium">
                {format(parseISO(session.starts_at), 'h:mm a')} - {format(parseISO(session.ends_at), 'h:mm a')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Previous Lesson Comparison */}
        {session.session_type !== 'testing' && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Previous Lesson Comparison</p>
              </div>
              {previousReport ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Previous Report Date</p>
                      <p className="font-medium">{format(parseISO(previousReport.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-muted-foreground">Overall:</p>
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {previousReport.overall || '-'}/10
                      </Badge>
                    </div>
                  </div>
                  {/* Show highlights from previous report */}
                  {(previousReport.focus_areas?.length > 0 || previousReport.strongest_skills?.length > 0 || previousReport.most_improved_skills?.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {previousReport.focus_areas?.length > 0 && (
                        <div>
                          <p className="text-muted-foreground mb-0.5">Focus Areas</p>
                          {previousReport.focus_areas.map((s: any, i: number) => (
                            <p key={i} className="font-medium text-orange-500">{s.skill_label || s}</p>
                          ))}
                        </div>
                      )}
                      {previousReport.strongest_skills?.length > 0 && (
                        <div>
                          <p className="text-muted-foreground mb-0.5">Strongest</p>
                          {previousReport.strongest_skills.map((s: any, i: number) => (
                            <p key={i} className="font-medium text-green-500">{s.skill_label || s}</p>
                          ))}
                        </div>
                      )}
                      {previousReport.most_improved_skills?.length > 0 && (
                        <div>
                          <p className="text-muted-foreground mb-0.5">Most Improved</p>
                          {previousReport.most_improved_skills.map((s: any, i: number) => (
                            <p key={i} className="font-medium text-blue-500">{s.skill_label || s}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <Link to={`/report-cards/${previousReport.id}`} target="_blank">
                    <Button variant="outline" size="sm" className="w-full min-h-[40px] gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      Open Previous Report Card
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No previous report card available yet.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Ratings */}
        <Card className="luxury-card">
          <CardHeader>
            <CardTitle>Skill Ratings (1-10)</CardTitle>
            {previousReport && (
              <p className="text-xs text-muted-foreground mt-1">
                Green markers show previous lesson scores for comparison
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {RATING_CATEGORIES.map(category => {
              const currentVal = formData[category.key as keyof typeof formData] as number;
              const prevVal = previousReport ? (previousReport[category.key] as number | null) : null;
              const delta = prevVal != null ? currentVal - prevVal : null;

              return (
                <div key={category.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      {category.label}
                      {prevVal != null && delta !== null && delta !== 0 && (
                        <span className={`text-[10px] font-semibold ${delta > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      )}
                    </Label>
                    <div className="flex items-center gap-2">
                      {prevVal != null && (
                        <span className="text-[10px] text-green-500 font-medium">Prev: {prevVal}</span>
                      )}
                      <span className="font-bold text-primary">{currentVal}</span>
                    </div>
                  </div>
                  <div className="relative">
                    <Slider
                      value={[currentVal]}
                      onValueChange={(value) => handleRatingChange(category.key, value)}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    {/* Green previous-lesson comparison marker */}
                    {prevVal != null && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 pointer-events-none z-10"
                        style={{ left: `${((prevVal - 1) / 9) * 100}%` }}
                      >
                        <div className="w-0.5 h-5 bg-green-500 rounded-full opacity-80 -translate-x-1/2" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Skill Progress Highlights */}
        {session.session_type !== 'testing' && (
          <SkillHighlightsEditor
            strongest={highlightStrongest}
            mostImproved={highlightMostImproved}
            focusAreas={highlightFocusAreas}
            onChange={(field, items) => {
              if (field === 'strongest') setHighlightStrongest(items);
              else if (field === 'mostImproved') setHighlightMostImproved(items);
              else setHighlightFocusAreas(items);
            }}
            currentRatings={formData as unknown as Record<string, number>}
            priorReports={priorReports}
            isFirstLesson={priorReports.length === 0}
          />
        )}

        {/* Lesson Summary */}
        <Card className="luxury-card">
          <CardHeader>
            <CardTitle>Lesson Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transcription">Summary Notes</Label>
              <Textarea
                id="transcription"
                value={formData.transcription_summary}
                onChange={(e) => setFormData(prev => ({ ...prev, transcription_summary: e.target.value }))}
                placeholder="Summary of the lesson..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="luxury-card">
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message_to_student">Message to Student</Label>
              <Textarea
                id="message_to_student"
                value={formData.message_to_student}
                onChange={(e) => setFormData(prev => ({ ...prev, message_to_student: e.target.value }))}
                placeholder="Feedback and encouragement for the student..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">This will be visible to the student after submission</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="internal_message">Internal Notes (Staff Only)</Label>
              <Textarea
                id="internal_message"
                value={formData.internal_message}
                onChange={(e) => setFormData(prev => ({ ...prev, internal_message: e.target.value }))}
                placeholder="Notes for staff/admin only..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">This will NOT be visible to the student</p>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!isCompleted && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 min-h-[44px]"
              disabled={saving}
              onClick={handleSaveDraft}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </>
              )}
            </Button>
          )}
          <Button
            type="submit"
            className="flex-1 cta-button min-h-[44px]"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {isCompleted ? 'Update Report Card' : 'Submit Report Card'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function ReportCardStatusBadge({ status }: { status: ReportCardStatus | string }) {
  switch (status) {
    case 'draft':
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">Draft</Badge>;
    case 'in_progress':
      return <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30">In Progress</Badge>;
    case 'completed':
      return <Badge variant="secondary" className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">Completed</Badge>;
    default:
      return null;
  }
}
