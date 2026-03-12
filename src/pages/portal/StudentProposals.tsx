import { useState, useEffect } from "react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Check, X, Clock, AlertTriangle, Send } from "lucide-react";
import { SessionTypeBadge } from "@/components/portal/SessionTypeBadge";
import { format, parseISO } from "date-fns";
import { getDisplayName } from "@/lib/profileUtils";
import { toast } from "sonner";

export default function StudentProposals() {
  return (
    <ProtectedRoute allowedRoles={['student']}>
      <PortalLayout>
        <StudentProposalsContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function StudentProposalsContent() {
  const { user } = usePortalAuth();
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [declineReason, setDeclineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => { if (user) fetchProposals(); }, [user]);

  const fetchProposals = async () => {
    const { data } = await supabase
      .from('schedule_proposals')
      .select('*, instructor:profiles!schedule_proposals_instructor_id_fkey(*)')
      .eq('student_id', user!.id)
      .order('created_at', { ascending: false });
    setProposals(data || []);
    setLoading(false);
  };

  const openProposal = async (proposal: any) => {
    setSelectedProposal(proposal);
    setResultMessage(null);
    const { data } = await supabase
      .from('schedule_proposal_items')
      .select('*')
      .eq('proposal_id', proposal.id)
      .order('proposed_date', { ascending: true });
    setItems(data || []);
  };

  const handleAction = async (action: 'accept' | 'decline') => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-proposal-action', {
        body: {
          action,
          proposal_id: selectedProposal.id,
          reason: action === 'decline' ? declineReason : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (action === 'accept') {
        setResultMessage(data.message);
        toast.success('Proposal accepted');
      } else {
        toast.success('Proposal declined');
        setSelectedProposal(null);
      }
      fetchProposals();
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-primary/10 text-primary';
      case 'pending_admin_finalize': return 'bg-orange-500/10 text-orange-500';
      case 'auto_scheduled': case 'finalized': return 'bg-green-500/10 text-green-500';
      case 'declined': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'sent': return 'Awaiting Your Review';
      case 'pending_admin_finalize': return 'Accepted — Pending';
      case 'auto_scheduled': return 'Scheduled';
      case 'finalized': return 'Finalized';
      case 'declined': return 'Declined';
      case 'partially_scheduled': return 'Partially Scheduled';
      default: return status;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold theme-heading">Proposed Schedules</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and respond to schedule proposals from your instructor</p>
      </div>

      {loading ? (
        <Card className="portal-card"><CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : proposals.length === 0 ? (
        <Card className="portal-card">
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No schedule proposals yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {proposals.map(p => (
            <Card key={p.id} className="portal-card cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openProposal(p)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">
                      From {getDisplayName(p.instructor, 'Instructor')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(p.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <Badge className={`shrink-0 text-xs ${statusColor(p.proposal_status)}`}>
                    {statusLabel(p.proposal_status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Proposal Detail Dialog */}
      <Dialog open={!!selectedProposal} onOpenChange={(o) => { if (!o) setSelectedProposal(null); }}>
        <DialogContent className="w-[min(95vw,560px)] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Schedule Proposal
            </DialogTitle>
          </DialogHeader>

          {selectedProposal && (
            <div className="space-y-4">
              {/* Info */}
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Instructor:</span> {getDisplayName(selectedProposal.instructor, 'Instructor')}</p>
                <p><span className="text-muted-foreground">Sent:</span> {format(parseISO(selectedProposal.created_at), 'MMM d, yyyy h:mm a')}</p>
                <Badge className={`text-xs mt-1 ${statusColor(selectedProposal.proposal_status)}`}>
                  {statusLabel(selectedProposal.proposal_status)}
                </Badge>
              </div>

              {selectedProposal.note_to_student && (
                <Card className="border-primary/20">
                  <CardContent className="p-3 text-sm">
                    <p className="text-xs text-muted-foreground mb-1">Note from instructor</p>
                    {selectedProposal.note_to_student}
                  </CardContent>
                </Card>
              )}

              {/* Mode info */}
              {selectedProposal.proposal_status === 'sent' && (
                <Card className="border-border/50 bg-muted/30">
                  <CardContent className="p-3 text-xs text-muted-foreground">
                    {selectedProposal.acceptance_mode === 'auto_schedule_on_accept'
                      ? 'After you accept, these dates will be added directly to your schedule.'
                      : 'After you accept, these dates will be marked as pending until an admin finalizes your schedule.'}
                  </CardContent>
                </Card>
              )}

              {/* Result message */}
              {resultMessage && (
                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="p-4 text-sm">{resultMessage}</CardContent>
                </Card>
              )}

              {/* Items */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Proposed Dates ({items.length})</Label>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg text-sm">
                      <Badge variant="secondary" className="text-[10px] shrink-0">{idx + 1}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {format(parseISO(item.proposed_date), 'EEE, MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.start_time.slice(0, 5)} – {item.end_time.slice(0, 5)}
                        </p>
                      </div>
                      <SessionTypeBadge sessionType={item.session_type} />
                      {item.item_status === 'conflict' && (
                        <Badge variant="destructive" className="text-[10px]">Conflict</Badge>
                      )}
                      {(item.item_status === 'auto_scheduled' || item.item_status === 'finalized') && (
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions - only show for 'sent' proposals */}
              {selectedProposal.proposal_status === 'sent' && !resultMessage && (
                <div className="space-y-3 pt-2">
                  <Button
                    className="w-full min-h-[44px] gap-2"
                    onClick={() => handleAction('accept')}
                    disabled={actionLoading}
                  >
                    <Check className="h-4 w-4" />
                    Accept Proposed Schedule
                  </Button>

                  <div className="space-y-1.5">
                    <Textarea
                      value={declineReason}
                      onChange={e => setDeclineReason(e.target.value)}
                      placeholder="Reason for declining (optional)"
                      className="min-h-[50px] text-sm"
                    />
                    <Button
                      variant="outline"
                      className="w-full min-h-[44px] gap-2"
                      onClick={() => handleAction('decline')}
                      disabled={actionLoading}
                    >
                      <X className="h-4 w-4" />
                      Decline Proposal
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
