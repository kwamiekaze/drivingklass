import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { ReportCardSplash } from "@/components/portal/ReportCardSplash";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2, Upload, Calendar, User } from "lucide-react";
import { Session, ReportCard, RATING_CATEGORIES } from "@/types/portal";
import { format, parseISO } from "date-fns";
import { getDisplayName } from "@/lib/profileUtils";

export default function ReportCardForm() {
  const { user, role } = usePortalAuth();
  const [splashComplete, setSplashComplete] = useState(false);

  // Show splash for instructor only (admin skips splash)
  if (user && !splashComplete) {
    return (
      <ReportCardSplash
        userId={user.id}
        userRole={role}
        onComplete={() => setSplashComplete(true)}
      />
    );
  }

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
  const audioInputRef = useRef<HTMLInputElement>(null);

  const sessionId = searchParams.get('session_id');
  const isEditing = !!id;

  const [session, setSession] = useState<Session | null>(null);
  const [existingCard, setExistingCard] = useState<ReportCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    lesson_audio_url: '',
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

  useEffect(() => {
    if (isEditing && id) {
      fetchExistingCard();
    } else if (sessionId) {
      fetchSession();
    } else {
      setLoading(false);
    }
  }, [sessionId, id]);

  const fetchSession = async () => {
    const { data } = await supabase
      .from('sessions')
      .select('*, student:profiles!sessions_student_id_fkey(*), instructor:profiles!sessions_instructor_id_fkey(*)')
      .eq('id', sessionId)
      .single();

    if (data) {
      setSession(data as Session);
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
      setExistingCard(data as ReportCard);
      setSession(data.session as Session);
      setFormData({
        lesson_audio_url: data.lesson_audio_url || '',
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

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an audio file under 50MB",
          variant: "destructive",
        });
        return;
      }
      setAudioFile(file);
    }
  };

  const handleRatingChange = (key: string, value: number[]) => {
    setFormData(prev => ({ ...prev, [key]: value[0] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !user) return;

    setSaving(true);

    try {
      let audioUrl = formData.lesson_audio_url;

      // Upload audio file if selected
      if (audioFile) {
        const fileExt = audioFile.name.split('.').pop();
        const fileName = `${session.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('lesson-audio')
          .upload(fileName, audioFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('lesson-audio')
          .getPublicUrl(fileName);
        
        audioUrl = urlData.publicUrl;
      }

      const reportData = {
        ...formData,
        lesson_audio_url: audioUrl || null,
        session_id: session.id,
        student_id: session.student_id,
        instructor_id: session.instructor_id,
      };

      if (isEditing && existingCard) {
        const { error } = await supabase
          .from('report_cards')
          .update(reportData)
          .eq('id', existingCard.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('report_cards')
          .insert(reportData);

        if (error) throw error;
      }

      toast({
        title: isEditing ? "Report Updated" : "Report Created",
        description: "The report card has been saved successfully.",
      });

      navigate(-1);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save report card",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold theme-heading">
            {isEditing ? 'Edit Report Card' : 'New Report Card'}
          </h1>
          <p className="text-muted-foreground">
            {getDisplayName(session.student, 'Student')} - {format(parseISO(session.starts_at), 'MMMM d, yyyy h:mm a')}
          </p>
        </div>
      </div>

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
        {/* Ratings */}
        <Card className="luxury-card">
          <CardHeader>
            <CardTitle>Skill Ratings (1-10)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {RATING_CATEGORIES.map(category => (
              <div key={category.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{category.label}</Label>
                  <span className="font-bold text-primary">
                    {formData[category.key as keyof typeof formData]}
                  </span>
                </div>
                <Slider
                  value={[formData[category.key as keyof typeof formData] as number]}
                  onValueChange={(value) => handleRatingChange(category.key, value)}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Audio & Summary */}
        <Card className="luxury-card">
          <CardHeader>
            <CardTitle>Lesson Recording</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Audio File (Optional)</Label>
              <div className="flex gap-2">
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => audioInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Audio
                </Button>
                {audioFile && <span className="text-sm text-muted-foreground">{audioFile.name}</span>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="audio_url">Or Audio URL</Label>
              <Input
                id="audio_url"
                value={formData.lesson_audio_url}
                onChange={(e) => setFormData(prev => ({ ...prev, lesson_audio_url: e.target.value }))}
                placeholder="https://..."
                className="theme-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transcription">Transcription Summary</Label>
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
              <p className="text-xs text-muted-foreground">This will be visible to the student</p>
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

        <Button type="submit" className="w-full cta-button" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? 'Update Report Card' : 'Submit Report Card'}
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
