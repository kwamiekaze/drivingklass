import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { Loader2 } from "lucide-react";
import reportCardSplashVideo from "@/assets/report-card-splash.mov";
import { supabase } from "@/integrations/supabase/client";
import { fetchSessionNumberForStudent } from "@/lib/sessionNumbering";

/**
 * RoadTestResultOpen - Splash screen route for opening road test results
 * Shows the splash video, then navigates to the road test result view
 */
export default function RoadTestResultOpen() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = usePortalAuth();

  const [isFading, setIsFading] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [studentFirstName, setStudentFirstName] = useState<string>("");
  const [instructorFirstName, setInstructorFirstName] = useState<string>("");
  const [lessonNumber, setLessonNumber] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || !sessionId) return;
    (async () => {
      const { data: s } = await supabase
        .from('sessions')
        .select('student_id, instructor_id')
        .eq('id', sessionId)
        .single();
      if (!s) return;
      const [stu, ins] = await Promise.all([
        s.student_id ? supabase.from('profiles').select('first_name, full_name').eq('id', s.student_id).single() : Promise.resolve({ data: null } as any),
        s.instructor_id ? supabase.from('profiles').select('first_name, full_name').eq('id', s.instructor_id).single() : Promise.resolve({ data: null } as any),
      ]);
      const pickFirst = (p: any) => p?.first_name?.trim() || p?.full_name?.trim()?.split(' ')?.[0] || '';
      setStudentFirstName(pickFirst(stu?.data));
      setInstructorFirstName(pickFirst(ins?.data));
      if (s.student_id) {
        const num = await fetchSessionNumberForStudent(supabase, s.student_id, sessionId);
        setLessonNumber(num);
      }
    })();
  }, [user, sessionId]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=${encodeURIComponent(`/road-test-results/${sessionId}`)}`);
    }
  }, [user, authLoading, navigate, sessionId]);

  useEffect(() => {
    fallbackTimerRef.current = setTimeout(() => {
      if (!videoLoaded) handleComplete();
    }, 3000);
    return () => { if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current); };
  }, []);

  const handleComplete = () => {
    if (isFading) return;
    setIsFading(true);
    setTimeout(() => {
      navigate(`/road-test-results/${sessionId}`, { replace: true, state: { fromSplash: true } });
    }, 400);
  };

  const handleVideoLoaded = () => {
    setVideoLoaded(true);
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div
      onClick={handleComplete}
      style={{
        position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
        zIndex: 9999, overflow: "hidden", backgroundColor: "#000",
        opacity: isFading ? 0 : 1, transition: "opacity 400ms ease-out",
        cursor: "pointer", touchAction: "manipulation",
      }}
    >
      <video
        ref={videoRef}
        src={reportCardSplashVideo}
        autoPlay muted playsInline preload="auto"
        onLoadedData={handleVideoLoaded}
        onEnded={handleComplete}
        onError={handleComplete}
        style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
          objectFit: "cover", opacity: videoLoaded ? 1 : 0,
          transition: "opacity 400ms ease-out", pointerEvents: "none",
        }}
      />
      {!videoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{ width: 40, height: 40, border: "3px solid rgba(212,165,116,0.3)", borderTopColor: "rgb(212,165,116)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {videoLoaded && (
        <div style={{
          position: "absolute", bottom: "max(5rem, calc(env(safe-area-inset-bottom, 2rem) + 3rem))",
          left: "50%", transform: "translateX(-50%)", fontSize: "0.875rem",
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "rgba(212, 165, 116, 0.8)", textShadow: "0 0 20px rgba(212, 165, 116, 0.4)",
          pointerEvents: "none", zIndex: 10,
        }}>
          Tap to continue
        </div>
      )}

      {videoLoaded && (studentFirstName || instructorFirstName) && (
        <div style={{
          position: 'absolute',
          bottom: 'max(9rem, calc(env(safe-area-inset-bottom, 2rem) + 7rem))',
          left: 0, right: 0, textAlign: 'center',
          pointerEvents: 'none', zIndex: 10, padding: '0 1.5rem',
        }}>
          {studentFirstName && (
            <div style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(1.5rem, 5vw, 2.25rem)',
              fontWeight: 700, lineHeight: 1.1,
              background: 'linear-gradient(135deg, #f5d78a 0%, #d4a574 50%, #b8863f 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))',
            }}>
              {studentFirstName}
              {lessonNumber ? ` — Road Test ${lessonNumber}` : ' — Road Test'}
            </div>
          )}
          {instructorFirstName && (
            <div style={{
              marginTop: '0.5rem',
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(0.75rem, 2.5vw, 0.95rem)',
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'rgba(212, 165, 116, 0.9)',
              textShadow: '0 0 12px rgba(0,0,0,0.7)',
            }}>
              Submitted by: {instructorFirstName}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
