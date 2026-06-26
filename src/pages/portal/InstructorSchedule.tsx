import { useEffect, useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { SessionCalendar } from "@/components/portal/SessionCalendar";
import { StudentFullScheduleSection } from "@/components/portal/StudentFullScheduleSection";
import type { CalendarEvent } from "@/components/portal/FullCalendarView";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { Profile, Session } from "@/types/portal";

export default function InstructorSchedule() {
  return (
    <ProtectedRoute allowedRoles={["instructor"]}>
      <PortalLayout>
        <InstructorScheduleContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function InstructorScheduleContent() {
  const { user } = usePortalAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [{ data: sessionsData }, { data: assignmentsData }, { data: blockData }] = await Promise.all([
      supabase
        .from("sessions")
        .select("*, student:profiles!sessions_student_id_fkey(*), instructor:profiles!sessions_instructor_id_fkey(*)")
        .eq("instructor_id", user.id)
        .order("starts_at", { ascending: true }),
      supabase
        .from("instructor_students")
        .select("student:profiles!instructor_students_student_id_fkey(*)")
        .eq("instructor_id", user.id),
      (supabase as any)
        .from("schedule_blocks")
        .select("*")
        .order("starts_at", { ascending: true }),
    ]);

    setSessions((sessionsData || []) as Session[]);
    setBlocks(blockData || []);
    setAssignedStudents(((assignmentsData || []).map((row: any) => row.student).filter(Boolean)) as Profile[]);
    setLoading(false);
  };

  const blockEvents: CalendarEvent[] = useMemo(() => (blocks || []).map((b: any) => ({
    id: `block-${b.id}`,
    title: b.title || 'Unavailable',
    subtitle: b.instructor_id ? '🚫 Instructor unavailable' : '🚫 All instructors',
    start: b.starts_at,
    end: b.ends_at,
    color: 'bg-muted text-muted-foreground border-l-4 border-muted-foreground/60',
    dotColor: 'bg-muted-foreground',
    meta: { type: 'block', block: b },
  })), [blocks]);

  const students = useMemo(() => Array.from(
    new Map(
      [
        ...assignedStudents,
        ...sessions.map((session) => session.student).filter((student): student is Profile => Boolean(student)),
      ].map((student) => [student.id, student] as const)
    ).values()
  ), [assignedStudents, sessions]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold theme-heading flex items-center gap-2">
          <Calendar className="h-7 w-7 text-primary" />
          Schedule
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading ? "Loading schedule..." : `${sessions.length} session${sessions.length === 1 ? "" : "s"} • ${blockEvents.length} blocked`}
        </p>
      </div>

      <SessionCalendar
        sessions={sessions}
        userRole="instructor"
        onSessionUpdate={fetchData}
        defaultView="month"
        extraEvents={blockEvents}
      />
      <StudentFullScheduleSection students={students} currentUserId={user?.id} />
    </div>
  );
}
