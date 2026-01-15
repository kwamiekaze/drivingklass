import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, User, Mail, Phone, RefreshCw, AlertTriangle, Clock, Save, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { getDisplayName, getProfileInitials } from "@/lib/profileUtils";

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  approval_status: string;
  created_at: string;
  last_sign_in_at: string | null;
  permit_number?: string | null;
  hours_remaining?: number;
}

interface AdminUsersListProps {
  roleFilter: 'student' | 'instructor';
  defaultStatus?: 'approved' | 'pending' | 'rejected' | 'all';
  enableSearch?: boolean;
  enableFilters?: boolean;
}

export function AdminUsersList({ 
  roleFilter, 
  defaultStatus = 'approved',
  enableSearch = true,
  enableFilters = true 
}: AdminUsersListProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(defaultStatus);
  
  // Hours editor modal state
  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [hoursInput, setHoursInput] = useState("");
  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First get all user IDs with the specified role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', roleFilter);

      if (roleError) throw roleError;
      
      if (!roleData || roleData.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const userIds = roleData.map(r => r.user_id);

      // Then fetch profiles for those users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, full_name, email, phone, avatar_url, approval_status, created_at, last_sign_in_at, permit_number, hours_remaining')
        .in('id', userIds)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      setUsers(profilesData || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const openHoursModal = (user: UserProfile) => {
    setSelectedUser(user);
    setHoursInput((user.hours_remaining ?? 0).toString());
    setHoursModalOpen(true);
  };

  const handleSaveHours = async () => {
    if (!selectedUser) return;
    const numericHours = parseFloat(hoursInput);
    if (isNaN(numericHours) || numericHours < 0) {
      toast({ title: "Invalid", description: "Enter a valid number", variant: "destructive" });
      return;
    }
    setSavingHours(true);
    const { error } = await supabase.from('profiles').update({ hours_remaining: numericHours }).eq('id', selectedUser.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Hours Updated", description: `Set to ${numericHours.toFixed(1)} hours` });
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, hours_remaining: numericHours } : u));
      setHoursModalOpen(false);
    }
    setSavingHours(false);
  };

  // Debounced search - filter client-side for responsiveness
  const filteredUsers = useMemo(() => {
    let result = users;
    
    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(u => u.approval_status === statusFilter);
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(u => {
        const displayName = `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase() || 
                            u.full_name?.toLowerCase() || '';
        return displayName.includes(term) ||
          (u.email?.toLowerCase().includes(term)) ||
          (u.phone?.includes(term)) ||
          (u.permit_number?.toLowerCase().includes(term));
      });
    }
    
    return result;
  }, [users, searchTerm, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (error) {
    return (
      <Card className="portal-card">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="text-muted-foreground text-center">{error}</p>
            <Button onClick={fetchUsers} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      {(enableSearch || enableFilters) && (
        <Card className="portal-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {enableSearch && (
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, phone, or permit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
              {enableFilters && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border z-50">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button onClick={fetchUsers} variant="outline" size="icon" className="shrink-0">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <Card className="portal-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <span>{roleFilter === 'student' ? 'Students' : 'Instructors'}</span>
            <Badge variant="secondary">{filteredUsers.length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4 p-3 border rounded-xl">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mb-4 opacity-50" />
              <p>No {roleFilter}s found</p>
              {searchTerm && (
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              )}
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {filteredUsers.map(user => (
                <div 
                  key={user.id} 
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-xl hover:border-primary/30 transition-colors"
                >
                  {/* Avatar */}
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getProfileInitials(user as any)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">
                      {getDisplayName(user as any, 'Unknown')}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                      {user.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </span>
                      )}
                      {user.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          {user.phone}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mt-1">
                      <span>Signed up: {format(parseISO(user.created_at), 'MMM d, yyyy • h:mm a')}</span>
                      <span>
                        Last sign-in: {user.last_sign_in_at 
                          ? format(parseISO(user.last_sign_in_at), 'MMM d, yyyy • h:mm a')
                          : 'Never signed in'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status and Actions */}
                  <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0">
                    {roleFilter === 'student' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs gap-1"
                        onClick={() => openHoursModal(user)}
                      >
                        <Clock className="h-3 w-3" />
                        {(user.hours_remaining ?? 0).toFixed(1)}h
                      </Button>
                    )}
                    {getStatusBadge(user.approval_status)}
                    <Link to={roleFilter === 'student' ? `/admin/approvals` : `/admin/approvals`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hours Editor Modal */}
      <Dialog open={hoursModalOpen} onOpenChange={setHoursModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Hours</DialogTitle>
            <DialogDescription>Set lesson hours for {getDisplayName(selectedUser as any, 'student')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Hours Remaining</Label>
              <Input type="number" step="0.5" min="0" value={hoursInput} onChange={e => setHoursInput(e.target.value)} />
            </div>
            <Button onClick={handleSaveHours} disabled={savingHours} className="w-full gap-2">
              {savingHours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Hours
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}