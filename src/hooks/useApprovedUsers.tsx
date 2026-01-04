import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ApprovedUser {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  approval_status: string;
  created_at: string;
  permit_number?: string | null;
}

type RoleType = 'student' | 'instructor';

/**
 * Fetches approved users by role from user_roles + profiles tables
 * This is the single source of truth for getting approved students/instructors
 */
export function useApprovedUsers(role: RoleType) {
  const [users, setUsers] = useState<ApprovedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Get all user IDs with the specified role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', role);

      if (roleError) throw roleError;
      
      if (!roleData || roleData.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const userIds = roleData.map(r => r.user_id);

      // Step 2: Fetch profiles for those users WHERE approval_status = 'approved'
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, avatar_url, approval_status, created_at, permit_number')
        .in('id', userIds)
        .eq('approval_status', 'approved')
        .order('full_name', { ascending: true });

      if (profilesError) throw profilesError;

      setUsers(profilesData || []);
    } catch (err: any) {
      console.error(`Error fetching approved ${role}s:`, err);
      setError(err.message || `Failed to load ${role}s`);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, refetch: fetchUsers };
}

/**
 * Standalone function to get approved students
 * For use in components that don't need the hook pattern
 */
export async function getApprovedStudents(): Promise<ApprovedUser[]> {
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'student');

  if (roleError || !roleData || roleData.length === 0) return [];

  const userIds = roleData.map(r => r.user_id);

  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, avatar_url, approval_status, created_at, permit_number')
    .in('id', userIds)
    .eq('approval_status', 'approved')
    .order('full_name', { ascending: true });

  if (profilesError) return [];
  return profilesData || [];
}

/**
 * Standalone function to get approved instructors
 * For use in components that don't need the hook pattern
 */
export async function getApprovedInstructors(): Promise<ApprovedUser[]> {
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'instructor');

  if (roleError || !roleData || roleData.length === 0) return [];

  const userIds = roleData.map(r => r.user_id);

  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, avatar_url, approval_status, created_at, permit_number')
    .in('id', userIds)
    .eq('approval_status', 'approved')
    .order('full_name', { ascending: true });

  if (profilesError) return [];
  return profilesData || [];
}
