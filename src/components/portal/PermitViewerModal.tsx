import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Download, 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileImage,
  FileText,
  Calendar,
  Upload,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";

interface Permit {
  id: string;
  user_id: string;
  file_url: string;
  file_name: string | null;
  file_path: string | null;
  upload_source: string;
  uploaded_at: string;
  verified_status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_note: string | null;
}

interface PermitViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName?: string;
  onStatusChange?: () => void;
}

export function PermitViewerModal({ 
  open, 
  onOpenChange, 
  userId,
  userName = "User",
  onStatusChange
}: PermitViewerModalProps) {
  const { toast } = useToast();
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

  useEffect(() => {
    if (open && userId) {
      fetchPermits();
    }
  }, [open, userId]);

  const fetchPermits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('permits')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setPermits(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load permits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (permitId: string, status: 'approved' | 'rejected', note?: string) => {
    setActionLoading(permitId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('permits')
        .update({
          verified_status: status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_note: note || null,
        })
        .eq('id', permitId);

      if (error) throw error;

      toast({
        title: status === 'approved' ? "Permit Approved" : "Permit Rejected",
        description: `The permit has been ${status}.`,
      });

      await fetchPermits();
      onStatusChange?.();
      setShowRejectInput(null);
      setRejectNote("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  const handleDownload = async (url: string, fileName: string | null) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName || 'permit-file';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Verified</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Pending Review</Badge>;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'intake': return 'Intake Form';
      case 'chat': return 'Chat/Message';
      case 'admin': return 'Admin Upload';
      case 'profile': return 'Profile Update';
      default: return 'Other';
    }
  };

  const isImageFile = (url: string) => {
    const ext = url.toLowerCase().split('.').pop() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
            <DialogTitle className="text-lg sm:text-xl">Permit Documents</DialogTitle>
            <DialogDescription>
              Review uploaded permits for {userName}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)] px-4 pb-4 sm:px-6 sm:pb-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : permits.length === 0 ? (
              <div className="py-12 text-center">
                <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground font-medium">No Permits Uploaded</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This user has not uploaded any permit documents yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {permits.map((permit) => (
                  <div 
                    key={permit.id} 
                    className="border rounded-lg p-4 bg-card/50 space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {isImageFile(permit.file_url) ? (
                          <div className="relative h-16 w-16 rounded-lg overflow-hidden border bg-muted flex-shrink-0">
                            <img 
                              src={permit.file_url} 
                              alt="Permit thumbnail"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                const icon = document.createElement('div');
                                icon.innerHTML = '<svg class="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="h-16 w-16 rounded-lg border bg-muted flex items-center justify-center flex-shrink-0">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {permit.file_name || 'Permit Document'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {getStatusBadge(permit.verified_status)}
                            <Badge variant="outline" className="text-xs">
                              {getSourceLabel(permit.upload_source)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Uploaded: {format(new Date(permit.uploaded_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      {permit.reviewed_at && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Reviewed: {format(new Date(permit.reviewed_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>

                    {/* Admin Note */}
                    {permit.admin_note && (
                      <div className="text-sm bg-muted/50 rounded p-2">
                        <span className="text-muted-foreground">Admin Note: </span>
                        {permit.admin_note}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(permit.file_url)}
                            className="gap-1.5"
                          >
                            <Eye className="h-4 w-4" />
                            Preview
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View permit in full</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(permit.file_url, permit.file_name)}
                            className="gap-1.5"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download permit file</TooltipContent>
                      </Tooltip>

                      {permit.verified_status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleVerify(permit.id, 'approved')}
                            disabled={actionLoading === permit.id}
                            className="gap-1.5 bg-green-600 hover:bg-green-700"
                          >
                            {actionLoading === permit.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            Approve
                          </Button>

                          {showRejectInput === permit.id ? (
                            <div className="flex-1 min-w-[200px] space-y-2">
                              <Textarea
                                placeholder="Optional: reason for rejection..."
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                className="min-h-[60px] text-sm"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleVerify(permit.id, 'rejected', rejectNote)}
                                  disabled={actionLoading === permit.id}
                                >
                                  Confirm Reject
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setShowRejectInput(null);
                                    setRejectNote("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setShowRejectInput(permit.id)}
                              className="gap-1.5"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </Button>
                          )}
                        </>
                      )}

                      {permit.verified_status !== 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerify(permit.id, 'approved')}
                          disabled={actionLoading === permit.id}
                          className="gap-1.5"
                        >
                          Reset to Pending
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Full Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>Permit Preview</DialogTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => previewUrl && window.open(previewUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="p-4 overflow-auto max-h-[calc(95vh-80px)]">
            {previewUrl && (
              isImageFile(previewUrl) ? (
                <img 
                  src={previewUrl} 
                  alt="Permit preview" 
                  className="max-w-full mx-auto rounded-lg"
                />
              ) : (
                <iframe
                  src={previewUrl}
                  className="w-full h-[70vh] rounded-lg border"
                  title="Permit preview"
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Status badge component for use in cards
export function PermitStatusBadge({ 
  hasPermit, 
  verifiedStatus 
}: { 
  hasPermit: boolean; 
  verifiedStatus?: string | null;
}) {
  if (!hasPermit) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="bg-red-500/20 text-red-600 border-red-500/30 gap-1">
            <XCircle className="h-3 w-3" />
            No Permit
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Student has not uploaded a permit document</TooltipContent>
      </Tooltip>
    );
  }

  switch (verifiedStatus) {
    case 'approved':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="bg-green-500/20 text-green-600 border-green-500/30 gap-1">
              <CheckCircle className="h-3 w-3" />
              Permit Verified
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Permit has been verified by admin</TooltipContent>
        </Tooltip>
      );
    case 'rejected':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="bg-red-500/20 text-red-600 border-red-500/30 gap-1">
              <XCircle className="h-3 w-3" />
              Permit Rejected
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Permit was rejected - new upload required</TooltipContent>
        </Tooltip>
      );
    default:
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 gap-1">
              <Upload className="h-3 w-3" />
              Pending Review
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Permit uploaded, awaiting admin verification</TooltipContent>
        </Tooltip>
      );
  }
}