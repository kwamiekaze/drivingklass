import { useEffect, useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { SessionCalendar } from "@/components/portal/SessionCalendar";
import { StudentFullScheduleSection } from "@/components/portal/StudentFullScheduleSection";
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
  const [assignedStudents, setAssignedStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [{ data: sessionsData }, { data: assignmentsData }] = await Promise.all([
      supabase
        .from("sessions")
        .select("*, student:profiles!sessions_student_id_fkey(*), instructor:profiles!sessions_instructor_id_fkey(*)")
        .eq("instructor_id", user.id)
        .order("starts_at", { ascending: true }),
      supabase
        .from("instructor_students")
        .select("student:profiles!instructor_students_student_id_fkey(*)")
        .eq("instructor_id", user.id),
    ]);

    setSessions((sessionsData || []) as Session[]);
    setAssignedStudents(((assignmentsData || []).map((row: any) => row.student).filter(Boolean)) as Profile[]);
    setLoading(false);
  };

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
          {loading ? "Loading schedule..." : `${sessions.length} session${sessions.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <SessionCalendar sessions={sessions} userRole="instructor" onSessionUpdate={fetchData} defaultView="month" />
      <StudentFullScheduleSection students={students} currentUserId={user?.id} />
    </div>
  );
}