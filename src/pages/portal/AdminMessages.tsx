import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Headset, Search, Mail, Phone, MapPin, Calendar, FileText, Eye, Copy, Check, CheckCircle, XCircle, Download, UserPlus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { GalaxyStars } from "@/components/GalaxyStars";
import { LightModeBackground } from "@/components/LightModeBackground";

interface ContactSubmission {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string | null;
  message: string | null;
  status: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  converted_profile_id?: string | null;
}

export default function AdminMessages() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'staff']}>
      <PortalLayout>
        <AdminMessagesContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function AdminMessagesContent() {
  const [messages, setMessages] = useState<ContactSubmission[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<ContactSubmission | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    filterMessages();
  }, [messages, searchQuery, statusFilter]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  const filterMessages = () => {
    let filtered = [...messages];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(m => (m.status || 'new') === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.full_name?.toLowerCase().includes(query) ||
        m.email?.toLowerCase().includes(query) ||
        m.phone?.includes(query) ||
        m.message?.toLowerCase().includes(query) ||
        m.city?.toLowerCase().includes(query)
      );
    }

    setFilteredMessages(filtered);
  };

  const updateMessageStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('contact_submissions')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
      if (selectedMessage?.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, status: newStatus } : null);
      }
      toast({
        title: "Status updated",
        description: `Message marked as ${newStatus}`,
      });
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Copied!",
      description: `${field} copied to clipboard`,
    });
  };

  const openMessageDetail = (message: ContactSubmission) => {
    setSelectedMessage(message);
    setSheetOpen(true);
  };

  const getStatusBadge = (status: string | null) => {
    const s = status || 'new';
    switch (s) {
      case 'new':
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">New</Badge>;
      case 'reviewed':
        return <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 border-amber-500/30">Reviewed</Badge>;
      case 'closed':
        return <Badge variant="outline" className="text-muted-foreground">Closed</Badge>;
      default:
        return <Badge variant="outline">{s}</Badge>;
    }
  };

  const [viewingAttachment, setViewingAttachment] = useState<{url: string; name: string; isImage: boolean} | null>(null);

  const viewAttachment = async (attachmentPath: string, attachmentName: string) => {
    // The attachment_url field stores the path within the id-uploads bucket
    // Path format: contact-ids/{submissionId}/{timestamp}-{random}.{ext}
    if (!attachmentPath) {
      toast({
        title: "No attachment found",
        description: "This message doesn't have an attachment on record.",
        variant: "destructive",
      });
      return;
    }

    console.log("[DEV] Fetching signed URL for:", { bucket: "id-uploads", path: attachmentPath });

    try {
      const { data, error } = await supabase.storage
        .from('id-uploads')
        .createSignedUrl(attachmentPath, 600); // 10 minutes

      if (error) {
        console.error("[DEV] Signed URL error:", error);
        toast({
          title: "Attachment unavailable",
          description: "Could not load attachment. Check storage path/policies.",
          variant: "destructive",
        });
        return;
      }

      if (!data?.signedUrl) {
        toast({
          title: "Attachment unavailable", 
          description: "File not found in storage. Attachment may not have uploaded correctly.",
          variant: "destructive",
        });
        return;
      }

      // Determine if it's an image
      const lowerName = attachmentName?.toLowerCase() || attachmentPath.toLowerCase();
      const isImage = /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(lowerName);

      if (isImage) {
        // Open in modal for images
        setViewingAttachment({ url: data.signedUrl, name: attachmentName || 'Attachment', isImage: true });
      } else {
        // Open in new tab for PDFs and other files
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error("[DEV] Attachment view error:", err);
      toast({
        title: "Error loading attachment",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 relative">
      {/* Background matching homepage theme */}
      <div className="fixed inset-0 -z-10" style={{ pointerEvents: 'none' }}>
        {isDark ? (
          <>
            <div 
              className="absolute inset-0 transition-colors duration-500"
              style={{
                background: 'linear-gradient(180deg, hsl(30 15% 4%) 0%, hsl(0 0% 2%) 30%, hsl(0 0% 1%) 100%)',
              }}
            />
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 80% 60% at 50% 35%, hsl(40 80% 30% / 0.12) 0%, transparent 60%)',
              }}
            />
            <GalaxyStars />
          </>
        ) : (
          <LightModeBackground />
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Headset className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold theme-heading">Messages</h1>
            <p className="text-sm text-muted-foreground">Contact form submissions</p>
          </div>
        </div>
        <Badge variant="outline" className="w-fit">
          {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Filters */}
      <Card className="portal-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <Card className="portal-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">All Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || statusFilter !== 'all' ? 'No messages match your filters' : 'No messages yet'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => openMessageDetail(message)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">
                        {message.full_name || '(No name)'}
                      </p>
                      {getStatusBadge(message.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {message.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {message.phone}
                      </span>
                      {message.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {message.city}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {message.attachment_url && (
                      <Badge variant="outline" className="gap-1">
                        <FileText className="h-3 w-3" />
                        ID
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(message.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Headset className="h-5 w-5" />
              Message Details
            </SheetTitle>
            <SheetDescription>
              From {selectedMessage?.full_name || '(No name)'}
            </SheetDescription>
          </SheetHeader>

          {selectedMessage && (
            <div className="mt-6 space-y-6">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {getStatusBadge(selectedMessage.status)}
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Contact Information</h4>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedMessage.email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(selectedMessage.email, 'Email')}
                  >
                    {copiedField === 'Email' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedMessage.phone}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(selectedMessage.phone, 'Phone')}
                  >
                    {copiedField === 'Phone' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                {selectedMessage.city && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedMessage.city}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{format(new Date(selectedMessage.created_at), 'MMMM d, yyyy h:mm a')}</span>
                </div>
              </div>

              {/* Message */}
              {selectedMessage.message && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Message</h4>
                  <p className="text-sm p-3 bg-muted/50 rounded-lg whitespace-pre-wrap">
                    {selectedMessage.message}
                  </p>
                </div>
              )}

              {/* Attachment */}
              {selectedMessage.attachment_url ? (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Attachment</h4>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => viewAttachment(selectedMessage.attachment_url!, selectedMessage.attachment_name || 'Document')}
                  >
                    <Eye className="h-4 w-4" />
                    View ID ({selectedMessage.attachment_name || 'Document'})
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Attachment</h4>
                  <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">No attachment found on this message.</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Actions</h4>
                <div className="flex gap-2">
                  <Button
                    variant={selectedMessage.status === 'reviewed' ? 'secondary' : 'outline'}
                    className="flex-1 gap-2"
                    onClick={() => updateMessageStatus(selectedMessage.id, 'reviewed')}
                    disabled={selectedMessage.status === 'reviewed'}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark Reviewed
                  </Button>
                  <Button
                    variant={selectedMessage.status === 'closed' ? 'secondary' : 'outline'}
                    className="flex-1 gap-2"
                    onClick={() => updateMessageStatus(selectedMessage.id, 'closed')}
                    disabled={selectedMessage.status === 'closed'}
                  >
                    <XCircle className="h-4 w-4" />
                    Mark Closed
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Image Viewer Modal */}
      <Dialog open={!!viewingAttachment} onOpenChange={() => setViewingAttachment(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="truncate">{viewingAttachment?.name}</span>
              {viewingAttachment && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => window.open(viewingAttachment.url, '_blank')}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewingAttachment?.isImage && (
            <div className="flex items-center justify-center p-2">
              <img
                src={viewingAttachment.url}
                alt={viewingAttachment.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                onError={() => {
                  toast({
                    title: "Image failed to load",
                    description: "The image could not be displayed.",
                    variant: "destructive",
                  });
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}