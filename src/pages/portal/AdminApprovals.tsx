import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, User, FileText, Loader2, Mail, Phone } from "lucide-react";
import { Profile, UserRole } from "@/types/portal";
import { format } from "date-fns";

export default function AdminApprovals() {
  return (
    <ProtectedRoute allowedRoles={['staff', 'admin']}>
      <PortalLayout>
        <AdminApprovalsContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function AdminApprovalsContent() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<(Profile & { role?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      // Fetch roles for each profile
      const profilesWithRoles = await Promise.all(
        data.map(async (profile) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .maybeSingle();
          return { ...profile, role: roleData?.role || 'student' };
        })
      );
      setProfiles(profilesWithRoles as any);
    }
    setLoading(false);
  };

  const handleApprove = async (profileId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ approved: true })
      .eq('id', profileId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Approved", description: "User has been approved." });
      fetchProfiles();
    }
  };

  const handleRoleChange = async (profileId: string, newRole: UserRole) => {
    // Delete existing role and insert new one
    await supabase.from('user_roles').delete().eq('user_id', profileId);
    const { error } = await supabase.from('user_roles').insert({ user_id: profileId, role: newRole });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role Updated", description: `Role changed to ${newRole}.` });
      fetchProfiles();
    }
  };

  const pendingProfiles = profiles.filter(p => !p.approved);
  const approvedProfiles = profiles.filter(p => p.approved);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold theme-heading">User Approvals</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Manage user registrations and roles
        </p>
      </div>

      {/* Pending */}
      <Card className="portal-card">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-orange-500/20 text-orange-500 text-sm font-bold">
              {pendingProfiles.length}
            </span>
            Pending Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingProfiles.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm sm:text-base">
              No pending approvals
            </p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {pendingProfiles.map(profile => (
                <div 
                  key={profile.id} 
                  className="flex flex-col gap-3 p-4 border rounded-xl bg-background/50"
                >
                  {/* User Info Row */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">
                        {profile.full_name || 'Unknown User'}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        {profile.email}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {profile.intake_submitted && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <FileText className="h-3 w-3" />
                            Intake Done
                          </Badge>
                        )}
                        {profile.permit_file_url && (
                          <Badge variant="outline" className="text-xs">
                            Permit Uploaded
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Role Dropdown - Full Width on Mobile */}
                  <div className="w-full">
                    <label className="text-xs text-muted-foreground mb-1.5 block">Assign Role</label>
                    <Select 
                      value={profile.role} 
                      onValueChange={(v) => handleRoleChange(profile.id, v as UserRole)}
                    >
                      <SelectTrigger className="w-full min-h-[44px] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border z-50">
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="instructor">Instructor</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Buttons - Full Width Stack on Mobile */}
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <Button 
                      onClick={() => handleApprove(profile.id)} 
                      className="w-full sm:flex-1 min-h-[44px] gap-2"
                    >
                      <CheckCircle className="h-4 w-4" /> 
                      Approve User
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved */}
      <Card className="portal-card">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-lg sm:text-xl">
            Approved Users ({approvedProfiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvedProfiles.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">No approved users yet</p>
          ) : (
            <div className="space-y-3">
              {approvedProfiles.slice(0, 20).map(profile => (
                <div 
                  key={profile.id} 
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 border rounded-xl bg-background/50"
                >
                  {/* User Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">
                        {profile.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {profile.email}
                      </p>
                    </div>
                  </div>

                  {/* Role Badge + Dropdown */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Badge className="capitalize shrink-0">{profile.role}</Badge>
                    <Select 
                      value={profile.role} 
                      onValueChange={(v) => handleRoleChange(profile.id, v as UserRole)}
                    >
                      <SelectTrigger className="flex-1 sm:w-36 min-h-[40px] text-sm">
                        <SelectValue placeholder="Change role" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border z-50">
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="instructor">Instructor</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}