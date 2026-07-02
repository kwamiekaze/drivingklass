import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import reportCardSplashVideo from "@/assets/report-card-splash.mov";
import { fetchSessionNumberForStudent } from "@/lib/sessionNumbering";

/**
 * ReportCardOpen - Splash screen route for opening report cards
 * Shows the 6-second splash video, then navigates to the actual report card view
 * Tap anywhere to skip
 */
export default function ReportCardOpen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, isLoading: authLoading } = usePortalAuth();
  
  const [isFading, setIsFading] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [studentFirstName, setStudentFirstName] = useState<string>("");
  const [instructorFirstName, setInstructorFirstName] = useState<string>("");
  const [lessonNumber, setLessonNumber] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      const redirectPath = encodeURIComponent(`/report-cards/${id}`);
      navigate(`/login?redirect=${redirectPath}`);
    }
  }, [user, authLoading, navigate, id, location.pathname]);

  // Check if this report card belongs to a road test session — redirect to road test splash
  useEffect(() => {
    if (!user || !id) return;
    const checkSessionType = async () => {
      const { data: rc } = await supabase
        .from('report_cards')
        .select('session_id')
        .eq('id', id)
        .single();
      if (rc?.session_id) {
        const { data: session } = await supabase
          .from('sessions')
          .select('session_type')
          .eq('id', rc.session_id)
          .single();
        if (session?.session_type === 'testing') {
          navigate(`/road-test-results/${rc.session_id}/open`, { replace: true });
        }
      }
    };
    checkSessionType();
  }, [user, id, navigate]);

  // Fetch overlay data: student first name, instructor first name, lesson number
  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data: rc } = await supabase
        .from('report_cards')
        .select('student_id, instructor_id, session_id')
        .eq('id', id)
        .single();
      if (!rc) return;
      const [studentRes, instrRes] = await Promise.all([
        rc.student_id
          ? supabase.from('profiles').select('first_name, full_name').eq('id', rc.student_id).single()
          : Promise.resolve({ data: null } as any),
        rc.instructor_id
          ? supabase.from('profiles').select('first_name, full_name').eq('id', rc.instructor_id).single()
          : Promise.resolve({ data: null } as any),
      ]);
      const pickFirst = (p: any) =>
        p?.first_name?.trim() || p?.full_name?.trim()?.split(' ')?.[0] || '';
      setStudentFirstName(pickFirst(studentRes?.data));
      setInstructorFirstName(pickFirst(instrRes?.data));
      if (rc.student_id && rc.session_id) {
        const num = await fetchSessionNumberForStudent(supabase, rc.student_id, rc.session_id);
        setLessonNumber(num);
      }
    })();
  }, [user, id]);

  // Set fallback timer in case video fails to load
  useEffect(() => {
    fallbackTimerRef.current = setTimeout(() => {
      if (!videoLoaded) {
        handleComplete();
      }
    }, 3000);

    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  const handleComplete = () => {
    if (isFading) return;
    setIsFading(true);
    
    // Navigate to actual report card page with autoplay flag
    setTimeout(() => {
      navigate(`/report-cards/${id}`, { 
        replace: true,
        state: { fromSplash: true, attemptAutoplay: true } 
      });
    }, 400);
  };

  const handleVideoLoaded = () => {
    setVideoLoaded(true);
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }
  };

  const handleVideoEnded = () => {
    handleComplete();
  };

  const handleVideoError = () => {
    handleComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div
      onClick={handleSkip}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        backgroundColor: '#000000',
        opacity: isFading ? 0 : 1,
        transition: 'opacity 400ms ease-out',
        cursor: 'pointer',
        touchAction: 'manipulation',
      }}
    >
      {/* Full-screen video */}
      <video
        ref={videoRef}
        src={reportCardSplashVideo}
        autoPlay
        muted
        playsInline
        preload="auto"
        onLoadedData={handleVideoLoaded}
        onEnded={handleVideoEnded}
        onError={handleVideoError}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: videoLoaded ? 1 : 0,
          transition: 'opacity 400ms ease-out',
          pointerEvents: 'none',
        }}
      />

      {/* Loading spinner (shown while video loads) */}
      {!videoLoaded && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(212, 165, 116, 0.3)',
              borderTopColor: 'rgb(212, 165, 116)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <style>
            {`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      )}

      {/* "Tap to continue" text below the visual */}
      {videoLoaded && (
        <div
          style={{
            position: 'absolute',
            bottom: 'max(5rem, calc(env(safe-area-inset-bottom, 2rem) + 3rem))',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '0.875rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(212, 165, 116, 0.8)',
            textShadow: '0 0 20px rgba(212, 165, 116, 0.4)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          Tap to continue
        </div>
      )}

      {/* Personalized overlay: student name + lesson # + submitted by */}
      {videoLoaded && (studentFirstName || instructorFirstName) && (
        <div
          style={{
            position: 'absolute',
            bottom: 'max(9rem, calc(env(safe-area-inset-bottom, 2rem) + 7rem))',
            left: 0,
            right: 0,
            textAlign: 'center',
            pointerEvents: 'none',
            zIndex: 10,
            padding: '0 1.5rem',
          }}
        >
          {studentFirstName && (
            <div
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 'clamp(1.5rem, 5vw, 2.25rem)',
                fontWeight: 700,
                lineHeight: 1.1,
                color: '#000',
                textShadow: '0 0 20px rgba(255,255,255,0.7), 0 2px 4px rgba(255,255,255,0.5)',
              }}
            >
              {studentFirstName}
              {lessonNumber ? ` — Lesson ${lessonNumber}` : ''}
            </div>
          )}
          {instructorFirstName && (
            <div
              style={{
                marginTop: '0.5rem',
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 'clamp(0.75rem, 2.5vw, 0.95rem)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(212, 165, 116, 0.9)',
                textShadow: '0 0 12px rgba(0,0,0,0.7)',
              }}
            >
              Submitted by: {instructorFirstName}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
