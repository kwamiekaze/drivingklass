import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Check, Clock, Send, Eye, CheckCircle, XCircle, AlertTriangle, Plus } from "lucide-react";
import { SessionTypeBadge } from "@/components/portal/SessionTypeBadge";
import { ProposalBuilder } from "@/components/portal/ProposalBuilder";
import { format, parseISO } from "date-fns";
import { getDisplayName } from "@/lib/profileUtils";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

export default function AdminProposals() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'staff']}>
      <PortalLayout>
        <AdminProposalsContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function AdminProposalsContent() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [finalizing, setFinalizing] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);

  useEffect(() => { fetchProposals(); }, []);

  const fetchProposals = async () => {
    const { data } = await supabase
      .from('schedule_proposals')
      .select('*, student:profiles!schedule_proposals_student_id_fkey(*), instructor:profiles!schedule_proposals_instructor_id_fkey(*)')
      .order('created_at', { ascending: false });
    setProposals(data || []);
    setLoading(false);
  };

  const openProposal = async (proposal: any) => {
    setSelectedProposal(proposal);
    const { data } = await supabase
      .from('schedule_proposal_items')
      .select('*')
      .eq('proposal_id', proposal.id)
      .order('proposed_date', { ascending: true });
    setItems(data || []);
  };

  const handleFinalize = async () => {
    if (!selectedProposal) return;
    setFinalizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-proposal-action', {
        body: { action: 'finalize', proposal_id: selectedProposal.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data.scheduled} session(s) finalized${data.conflicts > 0 ? `, ${data.conflicts} conflict(s)` : ''}`);
      setSelectedProposal(null);
      fetchProposals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to finalize');
    } finally {
      setFinalizing(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-500/10 text-blue-500';
      case 'pending_admin_finalize': return 'bg-orange-500/10 text-orange-500';
      case 'auto_scheduled': case 'finalized': return 'bg-green-500/10 text-green-500';
      case 'declined': return 'bg-destructive/10 text-destructive';
      case 'partially_scheduled': case 'partially_finalized': return 'bg-yellow-500/10 text-yellow-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'sent': return 'Sent';
      case 'pending_admin_finalize': return 'Pending Finalization';
      case 'auto_scheduled': return 'Auto-Scheduled';
      case 'finalized': return 'Finalized';
      case 'declined': return 'Declined';
      case 'partially_scheduled': case 'partially_finalized': return 'Partial';
      default: return status;
    }
  };

  const pendingProposals = proposals.filter(p => p.proposal_status === 'pending_admin_finalize');
  const activeProposals = proposals.filter(p => ['sent'].includes(p.proposal_status));
  const completedProposals = proposals.filter(p => ['auto_scheduled', 'finalized', 'declined', 'partially_scheduled', 'partially_finalized'].includes(p.proposal_status));

  const renderProposalCard = (p: any) => (
    <Card key={p.id} className="portal-card cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openProposal(p)}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{getDisplayName(p.student, 'Student')}</p>
            <p className="text-xs text-muted-foreground">
              Instructor: {getDisplayName(p.instructor, 'Instructor')} • {format(parseISO(p.created_at), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${statusColor(p.proposal_status)}`}>
              {statusLabel(p.proposal_status)}
            </Badge>
            {p.acceptance_mode === 'auto_schedule_on_accept' && (
              <Badge variant="outline" className="text-[10px]">Auto</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold theme-heading">Schedule Proposals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingProposals.length} pending finalization
          </p>
        </div>
        <Button className="gap-2 min-h-[40px]" onClick={() => setBuilderOpen(true)}>
          <Plus className="h-4 w-4" />
          New Proposal
        </Button>
      </div>

      <Tabs defaultValue={pendingProposals.length > 0 ? "pending" : "all"} className="space-y-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="pending" className="gap-1 text-xs sm:text-sm min-h-[40px]">
            <Clock className="h-4 w-4" />
            Pending ({pendingProposals.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-1 text-xs sm:text-sm min-h-[40px]">
            <Send className="h-4 w-4" />
            Sent ({activeProposals.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1 text-xs sm:text-sm min-h-[40px]">
            <Calendar className="h-4 w-4" />
            All ({proposals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingProposals.length === 0 ? (
            <Card className="portal-card"><CardContent className="p-6 text-center text-muted-foreground">No pending proposals</CardContent></Card>
          ) : (
            <div className="space-y-3">{pendingProposals.map(renderProposalCard)}</div>
          )}
        </TabsContent>
        <TabsContent value="active">
          {activeProposals.length === 0 ? (
            <Card className="portal-card"><CardContent className="p-6 text-center text-muted-foreground">No active proposals</CardContent></Card>
          ) : (
            <div className="space-y-3">{activeProposals.map(renderProposalCard)}</div>
          )}
        </TabsContent>
        <TabsContent value="all">
          {proposals.length === 0 ? (
            <Card className="portal-card"><CardContent className="p-6 text-center text-muted-foreground">No proposals</CardContent></Card>
          ) : (
            <div className="space-y-3">{proposals.map(renderProposalCard)}</div>
          )}
        </TabsContent>
      </Tabs>

      {/* Proposal Detail */}
      <Dialog open={!!selectedProposal} onOpenChange={(o) => { if (!o) setSelectedProposal(null); }}>
        <DialogContent className="w-[min(95vw,560px)] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Proposal Details
            </DialogTitle>
          </DialogHeader>

          {selectedProposal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Student</p>
                  <p className="font-medium">{getDisplayName(selectedProposal.student, 'Student')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Instructor</p>
                  <p className="font-medium">{getDisplayName(selectedProposal.instructor, 'Instructor')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={`text-xs ${statusColor(selectedProposal.proposal_status)}`}>
                    {statusLabel(selectedProposal.proposal_status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mode</p>
                  <Badge variant="outline" className="text-xs">
                    {selectedProposal.acceptance_mode === 'auto_schedule_on_accept' ? 'Auto-Schedule' : 'Pending Admin'}
                  </Badge>
                </div>
              </div>

              {selectedProposal.accepted_at && (
                <p className="text-xs text-muted-foreground">
                  Accepted: {format(parseISO(selectedProposal.accepted_at), 'MMM d, yyyy h:mm a')}
                </p>
              )}

              {/* Items */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Dates ({items.length})</Label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg text-sm">
                      <Badge variant="secondary" className="text-[10px] shrink-0">{idx + 1}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{format(parseISO(item.proposed_date), 'EEE, MMM d, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">{item.start_time.slice(0, 5)} – {item.end_time.slice(0, 5)}</p>
                      </div>
                      <SessionTypeBadge sessionType={item.session_type} />
                      {item.item_status === 'pending_admin_finalize' && (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      {(item.item_status === 'auto_scheduled' || item.item_status === 'finalized') && (
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      )}
                      {item.item_status === 'conflict' && (
                        <Badge variant="destructive" className="text-[10px]">Conflict</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Finalize action for pending proposals */}
              {selectedProposal.proposal_status === 'pending_admin_finalize' && (
                <Button
                  className="w-full min-h-[44px] gap-2"
                  onClick={handleFinalize}
                  disabled={finalizing}
                >
                  <CheckCircle className="h-4 w-4" />
                  {finalizing ? 'Finalizing...' : 'Confirm Payment & Finalize Schedule'}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ProposalBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        onProposalSent={fetchProposals}
      />
    </div>
  );
}
