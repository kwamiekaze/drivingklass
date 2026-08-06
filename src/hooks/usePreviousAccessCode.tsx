import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Staff/instructor-only helper: fetch the access code used on this student's
 * most recent previous report card, so it can be reused across reports.
 */
export function usePreviousAccessCode(studentId?: string | null, excludeReportId?: string | null) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!studentId) {
        setCode(null);
        return;
      }
      setLoading(true);
      let query = supabase
        .from("report_cards")
        .select("id, public_access_code, created_at")
        .eq("student_id", studentId)
        .not("public_access_code", "is", null)
        .order("created_at", { ascending: false })
        .limit(5);
      if (excludeReportId) query = query.neq("id", excludeReportId);
      const { data } = await query;
      if (cancelled) return;
      const found = (data || []).find((r: any) => r.public_access_code);
      setCode(found?.public_access_code ?? null);
      setLoading(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [studentId, excludeReportId]);

  return { previousCode: code, loading };
}
