import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { UserRole, Profile, ApprovalStatus } from "@/types/portal";

interface PortalAuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  isApproved: boolean;
  isRejected: boolean;
  isPending: boolean;
  approvalStatus: ApprovalStatus | null;
  isIntakeSubmitted: boolean;
  isStaffOrAdmin: boolean;
  refetchProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuthContextType | undefined>(undefined);

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (profileData) {
      setProfile(profileData as Profile);
    }
  };

  const fetchRole = async (userId: string) => {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (roleData) {
      setRole(roleData.role as UserRole);
    }
  };

  const refetchProfile = async () => {
    if (user?.id) {
      await Promise.all([fetchProfile(user.id), fetchRole(user.id)]);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchRole(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        Promise.all([
          fetchProfile(session.user.id),
          fetchRole(session.user.id)
        ]).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    // If sign-in successful, immediately fetch profile and role for faster routing
    if (data?.user && !error) {
      await Promise.all([
        fetchProfile(data.user.id),
        fetchRole(data.user.id)
      ]);
    }
    
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  };

  // Determine approval status - check new field first, fallback to legacy boolean
  const approvalStatus: ApprovalStatus | null = 
    (profile as any)?.approval_status || 
    (profile?.approved ? 'approved' : profile ? 'pending' : null);
  
  const isApproved = approvalStatus === 'approved';
  const isRejected = approvalStatus === 'rejected';
  const isPending = approvalStatus === 'pending';
  const isIntakeSubmitted = profile?.intake_submitted ?? false;
  const isStaffOrAdmin = role === 'staff' || role === 'admin';

  return (
    <PortalAuthContext.Provider value={{
      user,
      session,
      profile,
      role,
      isLoading,
      isApproved,
      isRejected,
      isPending,
      approvalStatus,
      isIntakeSubmitted,
      isStaffOrAdmin,
      refetchProfile,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const context = useContext(PortalAuthContext);
  if (context === undefined) {
    throw new Error("usePortalAuth must be used within a PortalAuthProvider");
  }
  return context;
}
