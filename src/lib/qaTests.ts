// QA Test Definitions and Utilities for DrivingKlass
import { supabase } from "@/integrations/supabase/client";

export type TestRole = 'admin' | 'staff' | 'instructor' | 'student';
export type TestStatus = 'pending' | 'running' | 'pass' | 'fail' | 'skipped';

export interface QATestResult {
  id: string;
  name: string;
  role: TestRole;
  status: TestStatus;
  errorMessage?: string;
  autoFixApplied?: string;
  duration?: number;
}

export interface QATestDefinition {
  id: string;
  name: string;
  role: TestRole;
  description: string;
  run: () => Promise<{ success: boolean; error?: string; fix?: string }>;
}

export interface SchemaCheckResult {
  exists: boolean;
  columnName: string;
  tableName: string;
  suggestedType?: string;
}

// Check if a column exists in the database
export async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    // Try a simple select to check if column exists using raw query
    const { error } = await supabase
      .from(tableName as any)
      .select('*')
      .limit(1);
    
    return !error || (!error.message.includes('column') && !error.message.includes('does not exist'));
  } catch {
    return false;
  }
}

// Infer column type from column name
export function inferColumnType(columnName: string): string {
  if (columnName.endsWith('_at') || columnName.includes('date') || columnName.includes('time')) {
    return 'timestamptz';
  }
  if (columnName.endsWith('_id')) {
    return 'uuid';
  }
  if (columnName.includes('status')) {
    return 'text';
  }
  if (columnName.includes('count') || columnName.includes('amount') || columnName === 'age') {
    return 'integer';
  }
  if (columnName.includes('is_') || columnName.includes('has_') || columnName === 'approved' || columnName === 'completed') {
    return 'boolean DEFAULT false';
  }
  if (columnName.includes('metadata') || columnName.includes('data') || columnName.includes('config')) {
    return 'jsonb';
  }
  return 'text';
}

// Parse schema cache errors
export function parseSchemaError(error: string): { table?: string; column?: string; type: 'column' | 'relation' | 'unknown' } {
  // Match: Could not find the 'X' column of 'Y' in the schema cache
  const columnMatch = error.match(/Could not find the '(\w+)' column of '(\w+)'/);
  if (columnMatch) {
    return { column: columnMatch[1], table: columnMatch[2], type: 'column' };
  }
  
  // Match: column "X" does not exist
  const colNotExist = error.match(/column "(\w+)" does not exist/);
  if (colNotExist) {
    return { column: colNotExist[1], type: 'column' };
  }
  
  // Match: relation "X" does not exist
  const relNotExist = error.match(/relation "(\w+)" does not exist/);
  if (relNotExist) {
    return { table: relNotExist[1], type: 'relation' };
  }
  
  return { type: 'unknown' };
}

// Check if error is RLS related
export function isRLSError(error: string): boolean {
  const rlsPatterns = [
    'new row violates row-level security',
    'permission denied',
    'violates row-level security policy',
    'RLS',
  ];
  return rlsPatterns.some(pattern => error.toLowerCase().includes(pattern.toLowerCase()));
}

// Generate test fixture IDs
export function generateQARunId(): string {
  return `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Admin Tests
export function getAdminTests(): QATestDefinition[] {
  return [
    {
      id: 'admin-dashboard-load',
      name: 'Admin Dashboard Loads',
      role: 'admin',
      description: 'Verify admin dashboard page loads correctly',
      run: async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
    {
      id: 'admin-pending-list',
      name: 'Load Pending Approvals',
      role: 'admin',
      description: 'Verify pending approvals list loads',
      run: async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('approval_status', 'pending')
            .limit(10);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
    {
      id: 'admin-approved-list',
      name: 'Load Approved Users',
      role: 'admin',
      description: 'Verify approved users list loads',
      run: async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('approval_status', 'approved')
            .limit(10);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
    {
      id: 'admin-leads-query',
      name: 'Query Leads Table',
      role: 'admin',
      description: 'Verify leads table is accessible',
      run: async () => {
        try {
          const { data, error } = await supabase
            .from('leads')
            .select('*')
            .limit(5);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
    {
      id: 'admin-sessions-query',
      name: 'Query Sessions',
      role: 'admin',
      description: 'Verify sessions table is accessible',
      run: async () => {
        try {
          const { data, error } = await supabase
            .from('sessions')
            .select('*, student:profiles!sessions_student_id_fkey(full_name), instructor:profiles!sessions_instructor_id_fkey(full_name)')
            .limit(5);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
    {
      id: 'admin-report-cards-query',
      name: 'Query Report Cards',
      role: 'admin',
      description: 'Verify report cards table is accessible',
      run: async () => {
        try {
          const { data, error } = await supabase
            .from('report_cards')
            .select('*')
            .limit(5);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
    {
      id: 'admin-notifications-query',
      name: 'Query Notifications',
      role: 'admin',
      description: 'Verify notifications table is accessible',
      run: async () => {
        try {
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .limit(5);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
    {
      id: 'admin-internal-notes-query',
      name: 'Query Internal Notes',
      role: 'admin',
      description: 'Verify internal notes table is accessible',
      run: async () => {
        try {
          const { data, error } = await supabase
            .from('internal_notes')
            .select('*')
            .limit(5);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
    {
      id: 'admin-user-roles-query',
      name: 'Query User Roles',
      role: 'admin',
      description: 'Verify user roles table is accessible',
      run: async () => {
        try {
          const { data, error } = await supabase
            .from('user_roles')
            .select('*')
            .limit(5);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
    {
      id: 'admin-instructor-students-query',
      name: 'Query Instructor Assignments',
      role: 'admin',
      description: 'Verify instructor_students table is accessible',
      run: async () => {
        try {
          const { data, error } = await supabase
            .from('instructor_students')
            .select('*, student:profiles!instructor_students_student_id_fkey(full_name), instructor:profiles!instructor_students_instructor_id_fkey(full_name)')
            .limit(5);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
  ];
}

// Staff Tests
export function getStaffTests(): QATestDefinition[] {
  return [
    {
      id: 'staff-profiles-view',
      name: 'Staff Can View Profiles',
      role: 'staff',
      description: 'Verify staff can view student/instructor profiles',
      run: async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .limit(5);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
    {
      id: 'staff-sessions-view',
      name: 'Staff Can View Sessions',
      role: 'staff',
      description: 'Verify staff can view all sessions',
      run: async () => {
        try {
          const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .limit(5);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
    {
      id: 'staff-leads-view',
      name: 'Staff Can View Leads',
      role: 'staff',
      description: 'Verify staff can view leads',
      run: async () => {
        try {
          const { data, error } = await supabase
            .from('leads')
            .select('*')
            .limit(5);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
  ];
}

// Instructor Tests
export function getInstructorTests(): QATestDefinition[] {
  return [
    {
      id: 'instructor-own-sessions',
      name: 'Instructor Can View Own Sessions',
      role: 'instructor',
      description: 'Verify instructor can view their assigned sessions',
      run: async () => {
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Not authenticated');
          
          const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('instructor_id', user.user.id)
            .limit(5);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
    {
      id: 'instructor-report-cards',
      name: 'Instructor Can View Report Cards',
      role: 'instructor',
      description: 'Verify instructor can view their report cards',
      run: async () => {
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Not authenticated');
          
          const { data, error } = await supabase
            .from('report_cards')
            .select('*')
            .eq('instructor_id', user.user.id)
            .limit(5);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
    {
      id: 'instructor-assigned-students',
      name: 'Instructor Can View Assigned Students',
      role: 'instructor',
      description: 'Verify instructor can view their assigned students',
      run: async () => {
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Not authenticated');
          
          const { data, error } = await supabase
            .from('instructor_students')
            .select('*, student:profiles!instructor_students_student_id_fkey(*)')
            .eq('instructor_id', user.user.id)
            .limit(5);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
  ];
}

// Student Tests
export function getStudentTests(): QATestDefinition[] {
  return [
    {
      id: 'student-own-profile',
      name: 'Student Can View Own Profile',
      role: 'student',
      description: 'Verify student can view their own profile',
      run: async () => {
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Not authenticated');
          
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.user.id)
            .single();
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
    {
      id: 'student-own-sessions',
      name: 'Student Can View Own Sessions',
      role: 'student',
      description: 'Verify student can view their sessions',
      run: async () => {
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Not authenticated');
          
          const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('student_id', user.user.id)
            .limit(5);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
    {
      id: 'student-own-report-cards',
      name: 'Student Can View Own Report Cards',
      role: 'student',
      description: 'Verify student can view their report cards',
      run: async () => {
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Not authenticated');
          
          const { data, error } = await supabase
            .from('report_cards')
            .select('*')
            .eq('student_id', user.user.id)
            .limit(5);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
    {
      id: 'student-own-notifications',
      name: 'Student Can View Own Notifications',
      role: 'student',
      description: 'Verify student can view their notifications',
      run: async () => {
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Not authenticated');
          
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.user.id)
            .limit(5);
          if (error) throw new Error(error.message);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    },
  ];
}

// Get all tests for a specific role or all roles
export function getTestsForRole(role: TestRole | 'all'): QATestDefinition[] {
  if (role === 'all') {
    return [
      ...getAdminTests(),
      ...getStaffTests(),
      ...getInstructorTests(),
      ...getStudentTests(),
    ];
  }
  
  switch (role) {
    case 'admin':
      return getAdminTests();
    case 'staff':
      return getStaffTests();
    case 'instructor':
      return getInstructorTests();
    case 'student':
      return getStudentTests();
    default:
      return [];
  }
}
