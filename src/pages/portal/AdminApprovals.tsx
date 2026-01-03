import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, User, FileText, Loader2 } from "lucide-react";
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
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold theme-heading">User Approvals</h1>

      {/* Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending Approval ({pendingProfiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingProfiles.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No pending approvals</p>
          ) : (
            <div className="space-y-3">
              {pendingProfiles.map(profile => (
                <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <User className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{profile.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{profile.email}</p>
                      <div className="flex gap-2 mt-1">
                        {profile.intake_submitted && <Badge variant="outline"><FileText className="h-3 w-3 mr-1" />Intake Done</Badge>}
                        {profile.permit_file_url && <Badge variant="outline">Permit Uploaded</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={profile.role} onValueChange={(v) => handleRoleChange(profile.id, v as UserRole)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="instructor">Instructor</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => handleApprove(profile.id)} className="gap-2">
                      <CheckCircle className="h-4 w-4" /> Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved */}
      <Card>
        <CardHeader>
          <CardTitle>Approved Users ({approvedProfiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {approvedProfiles.slice(0, 10).map(profile => (
              <div key={profile.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{profile.full_name}</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{profile.role}</Badge>
                  <Select value={profile.role} onValueChange={(v) => handleRoleChange(profile.id, v as UserRole)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
