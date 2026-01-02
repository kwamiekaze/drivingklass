import { createContext, useContext, useEffect, useRef, useCallback, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Json } from "@/integrations/supabase/types";

// Types
interface AnalyticsEvent {
  event_type: "page_view" | "session_start" | "click";
  event_name?: string;
  path: string;
  page_title: string;
  session_id: string;
  user_id?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  device_type: string;
  user_agent?: string;
  metadata?: Record<string, string | number | boolean>;
}

interface AnalyticsContextType {
  trackEvent: (eventName: string, metadata?: Record<string, string | number | boolean>) => void;
  trackClick: (eventName: string, metadata?: Record<string, string | number | boolean>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

// Constants
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const FLUSH_INTERVAL_MS = 5000; // 5 seconds
const PAGE_VIEW_DEBOUNCE_MS = 3000; // 3 seconds
const SESSION_KEY = "dk_analytics_session";
const LAST_SEEN_KEY = "dk_analytics_last_seen";

// Utility functions
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

function getDeviceType(): string {
  const width = window.innerWidth;
  return width < 768 ? "mobile" : "desktop";
}

function getUTMParams(): Record<string, string | undefined> {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
    utm_term: params.get("utm_term") || undefined,
    utm_content: params.get("utm_content") || undefined,
  };
}

function getOrCreateSession(): { sessionId: string; isNew: boolean } {
  const now = Date.now();
  const storedSession = localStorage.getItem(SESSION_KEY);
  const lastSeen = localStorage.getItem(LAST_SEEN_KEY);

  // Check if session expired
  if (storedSession && lastSeen) {
    const timeSinceLastSeen = now - parseInt(lastSeen, 10);
    if (timeSinceLastSeen < SESSION_TIMEOUT_MS) {
      // Update last seen
      localStorage.setItem(LAST_SEEN_KEY, now.toString());
      return { sessionId: storedSession, isNew: false };
    }
  }

  // Create new session
  const newSessionId = generateSessionId();
  localStorage.setItem(SESSION_KEY, newSessionId);
  localStorage.setItem(LAST_SEEN_KEY, now.toString());
  return { sessionId: newSessionId, isNew: true };
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const eventQueueRef = useRef<AnalyticsEvent[]>([]);
  const lastPageViewRef = useRef<{ path: string; time: number } | null>(null);
  const sessionRef = useRef<{ id: string; startPath: string } | null>(null);

  // Flush events to database
  const flushEvents = useCallback(async () => {
    if (eventQueueRef.current.length === 0) return;

    const eventsToSend = [...eventQueueRef.current];
    eventQueueRef.current = [];

    try {
      const { error } = await supabase.from("analytics_events").insert(eventsToSend);
      if (error) {
        console.error("Analytics flush error:", error);
        // Retry once by adding back to queue
        eventQueueRef.current = [...eventsToSend, ...eventQueueRef.current].slice(0, 100);
      }
    } catch (err) {
      console.error("Analytics flush exception:", err);
      // Retry once
      eventQueueRef.current = [...eventsToSend, ...eventQueueRef.current].slice(0, 100);
    }
  }, []);

  // Queue event
  const queueEvent = useCallback((event: Omit<AnalyticsEvent, "session_id" | "device_type" | "user_agent" | "referrer"> & Partial<AnalyticsEvent>) => {
    const session = getOrCreateSession();
    const utmParams = getUTMParams();

    const fullEvent: AnalyticsEvent = {
      ...event,
      session_id: session.sessionId,
      device_type: getDeviceType(),
      user_agent: navigator.userAgent,
      referrer: document.referrer || undefined,
      user_id: user?.id,
      ...utmParams,
    };

    eventQueueRef.current.push(fullEvent);

    // Keep queue size reasonable
    if (eventQueueRef.current.length > 100) {
      eventQueueRef.current = eventQueueRef.current.slice(-100);
    }
  }, [user?.id]);

  // Track click event (public API)
  const trackClick = useCallback((eventName: string, metadata?: Record<string, string | number | boolean>) => {
    queueEvent({
      event_type: "click",
      event_name: eventName,
      path: location.pathname,
      page_title: document.title,
      metadata: metadata as Record<string, string | number | boolean> | undefined,
    });
  }, [location.pathname, queueEvent]);

  // Track custom event (public API)
  const trackEvent = useCallback((eventName: string, metadata?: Record<string, string | number | boolean>) => {
    queueEvent({
      event_type: "click",
      event_name: eventName,
      path: location.pathname,
      page_title: document.title,
      metadata: metadata as Record<string, string | number | boolean> | undefined,
    });
  }, [location.pathname, queueEvent]);

  // Initialize session and set up flush interval
  useEffect(() => {
    const session = getOrCreateSession();

    if (session.isNew) {
      sessionRef.current = { id: session.sessionId, startPath: location.pathname };
      
      // Log session start
      queueEvent({
        event_type: "session_start",
        path: location.pathname,
        page_title: document.title,
      });

      // Create session record
      supabase.from("analytics_sessions").insert({
        session_id: session.sessionId,
        first_path: location.pathname,
        last_path: location.pathname,
        page_count: 0,
        device_type: getDeviceType(),
        user_id: user?.id,
      }).then(({ error }) => {
        if (error) console.error("Session create error:", error);
      });
    }

    // Set up flush interval
    const flushInterval = setInterval(flushEvents, FLUSH_INTERVAL_MS);

    // Flush on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushEvents();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Flush on beforeunload
    const handleBeforeUnload = () => {
      flushEvents();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(flushInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flushEvents();
    };
  }, [flushEvents, location.pathname, queueEvent, user?.id]);

  // Track page views on route change
  useEffect(() => {
    const now = Date.now();
    const lastView = lastPageViewRef.current;

    // Debounce: skip if same path within 3 seconds
    if (lastView && lastView.path === location.pathname && now - lastView.time < PAGE_VIEW_DEBOUNCE_MS) {
      return;
    }

    lastPageViewRef.current = { path: location.pathname, time: now };

    queueEvent({
      event_type: "page_view",
      path: location.pathname,
      page_title: document.title,
    });

    // Update session last_path and page_count
    const session = getOrCreateSession();
    supabase.from("analytics_sessions")
      .update({
        last_path: location.pathname,
        last_seen_at: new Date().toISOString(),
        page_count: supabase.rpc ? undefined : 1, // Increment handled separately
      })
      .eq("session_id", session.sessionId)
      .then(({ error }) => {
        if (error && !error.message.includes("0 rows")) {
          console.error("Session update error:", error);
        }
      });
  }, [location.pathname, queueEvent]);

  return (
    <AnalyticsContext.Provider value={{ trackEvent, trackClick }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    // Return no-op functions if outside provider (for SSR safety)
    return {
      trackEvent: () => {},
      trackClick: () => {},
    };
  }
  return context;
}
