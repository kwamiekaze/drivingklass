import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Plus, Pencil, Trash2, Download, ExternalLink, Eye, Search, ImageIcon, X, CheckCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Service {
  id: string;
  title: string;
  description: string | null;
  price: string;
  square_link: string | null;
  display_order: number;
}

interface ContactSubmission {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string | null;
  message: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  status: string | null;
  created_at: string;
}

export default function Admin() {
  const { user, isLoading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<ContactSubmission[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasIdFilter, setHasIdFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});

  // Form state for service editing
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    square_link: "",
    display_order: 0,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin]);

  // Filter submissions
  useEffect(() => {
    let result = [...submissions];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        s =>
          s.full_name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.phone.toLowerCase().includes(query)
      );
    }

    // Has ID filter
    if (hasIdFilter === "yes") {
      result = result.filter(s => s.attachment_url);
    } else if (hasIdFilter === "no") {
      result = result.filter(s => !s.attachment_url);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(s => s.status === statusFilter);
    }

    setFilteredSubmissions(result);
  }, [submissions, searchQuery, hasIdFilter, statusFilter]);

  const fetchData = async () => {
    setIsLoadingData(true);
    
    // Fetch services
    const { data: servicesData, error: servicesError } = await supabase
      .from("services")
      .select("*")
      .order("display_order", { ascending: true });

    if (servicesError) {
      toast.error("Failed to load services");
    } else {
      setServices(servicesData || []);
    }

    // Fetch contact submissions
    const { data: submissionsData, error: submissionsError } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (submissionsError) {
      toast.error("Failed to load submissions");
    } else {
      setSubmissions(submissionsData || []);
    }

    setIsLoadingData(false);
  };

  // Generate signed URL for a file path (from private bucket)
  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    // Check if already cached
    if (signedUrls[filePath]) {
      return signedUrls[filePath];
    }

    setLoadingImages(prev => ({ ...prev, [filePath]: true }));

    try {
      // Try the new id-uploads bucket first
      let bucket = "id-uploads";
      let path = filePath;

      // If path doesn't include contact-ids, it might be from old contact-attachments bucket
      if (!filePath.startsWith("contact-ids/")) {
        bucket = "contact-attachments";
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600); // 1 hour expiry

      if (error) {
        console.error("Error creating signed URL:", error);
        // Fallback: try as public URL from contact-attachments
        const { data: publicData } = supabase.storage
          .from("contact-attachments")
          .getPublicUrl(filePath);
        
        if (publicData?.publicUrl) {
          setSignedUrls(prev => ({ ...prev, [filePath]: publicData.publicUrl }));
          return publicData.publicUrl;
        }
        return null;
      }

      setSignedUrls(prev => ({ ...prev, [filePath]: data.signedUrl }));
      return data.signedUrl;
    } catch (err) {
      console.error("Error getting signed URL:", err);
      return null;
    } finally {
      setLoadingImages(prev => ({ ...prev, [filePath]: false }));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const openCreateDialog = () => {
    setEditingService(null);
    setFormData({
      title: "",
      description: "",
      price: "",
      square_link: "",
      display_order: services.length,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      description: service.description || "",
      price: service.price,
      square_link: service.square_link || "",
      display_order: service.display_order,
    });
    setIsDialogOpen(true);
  };

  const handleSaveService = async () => {
    if (!formData.title || !formData.price) {
      toast.error("Title and price are required");
      return;
    }

    if (editingService) {
      const { error } = await supabase
        .from("services")
        .update({
          title: formData.title,
          description: formData.description || null,
          price: formData.price,
          square_link: formData.square_link || null,
          display_order: formData.display_order,
        })
        .eq("id", editingService.id);

      if (error) {
        toast.error("Failed to update service");
      } else {
        toast.success("Service updated");
        fetchData();
        setIsDialogOpen(false);
      }
    } else {
      const { error } = await supabase
        .from("services")
        .insert({
          title: formData.title,
          description: formData.description || null,
          price: formData.price,
          square_link: formData.square_link || null,
          display_order: formData.display_order,
        });

      if (error) {
        toast.error("Failed to create service");
      } else {
        toast.success("Service created");
        fetchData();
        setIsDialogOpen(false);
      }
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    const { error } = await supabase.from("services").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete service");
    } else {
      toast.success("Service deleted");
      fetchData();
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;

    const { error } = await supabase.from("contact_submissions").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete submission");
    } else {
      toast.success("Submission deleted");
      fetchData();
      if (selectedSubmission?.id === id) {
        setIsDetailOpen(false);
        setSelectedSubmission(null);
      }
    }
  };

  const handleMarkAsReviewed = async (id: string) => {
    const { error } = await supabase
      .from("contact_submissions")
      .update({ status: "reviewed" })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Marked as reviewed");
      fetchData();
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(prev => prev ? { ...prev, status: "reviewed" } : null);
      }
    }
  };

  const openSubmissionDetail = async (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    setIsDetailOpen(true);

    // Pre-fetch signed URLs for attachments
    if (submission.attachment_url) {
      const paths = submission.attachment_url.split(",").filter(p => p.trim());
      for (const path of paths) {
        if (!signedUrls[path]) {
          getSignedUrl(path);
        }
      }
    }
  };

  const getAttachmentPaths = (submission: ContactSubmission): string[] => {
    if (!submission.attachment_url) return [];
    return submission.attachment_url.split(",").filter(path => path.trim());
  };

  const getAttachmentNames = (submission: ContactSubmission): string[] => {
    if (!submission.attachment_name) return [];
    return submission.attachment_name.split(",").filter(name => name.trim());
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "reviewed":
        return <Badge variant="default" className="bg-green-600">Reviewed</Badge>;
      case "new":
      default:
        return <Badge variant="secondary">New</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!isAdmin && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              You don't have admin privileges. Please contact the administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSignOut} variant="outline" className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-display text-gold-shimmer">
            DRIVINGKLASS Admin
          </h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="submissions">Contact Submissions</TabsTrigger>
          </TabsList>

          {/* Services Tab */}
          <TabsContent value="services">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Services</CardTitle>
                  <CardDescription>Manage your service offerings and Square payment links</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={openCreateDialog} className="bg-primary text-primary-foreground">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Service
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>
                        {editingService ? "Edit Service" : "Add New Service"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g., Weekly Details"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Service description..."
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price">Price *</Label>
                        <Input
                          id="price"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          placeholder="e.g., $199/week"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="square_link">Square Payment Link</Label>
                        <Input
                          id="square_link"
                          value={formData.square_link}
                          onChange={(e) => setFormData({ ...formData, square_link: e.target.value })}
                          placeholder="https://square.link/..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="display_order">Display Order</Label>
                        <Input
                          id="display_order"
                          type="number"
                          value={formData.display_order}
                          onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <Button onClick={handleSaveService} className="w-full bg-primary text-primary-foreground">
                        {editingService ? "Save Changes" : "Create Service"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : services.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No services yet. Add your first service!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Square Link</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell>{service.display_order}</TableCell>
                          <TableCell className="font-medium">{service.title}</TableCell>
                          <TableCell>{service.price}</TableCell>
                          <TableCell>
                            {service.square_link ? (
                              <a
                                href={service.square_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                Link <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">Not set</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(service)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteService(service.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions">
            <Card>
              <CardHeader>
                <CardTitle>Contact Submissions</CardTitle>
                <CardDescription>View and manage contact form submissions</CardDescription>
                
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={hasIdFilter} onValueChange={setHasIdFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Has ID Upload" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Submissions</SelectItem>
                      <SelectItem value="yes">Has ID Upload</SelectItem>
                      <SelectItem value="no">No ID Upload</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredSubmissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {submissions.length === 0 ? "No submissions yet." : "No submissions match your filters."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Has ID?</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSubmissions.map((submission) => (
                          <TableRow key={submission.id}>
                            <TableCell className="whitespace-nowrap">
                              {new Date(submission.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium">{submission.full_name}</TableCell>
                            <TableCell>
                              <a href={`mailto:${submission.email}`} className="text-primary hover:underline">
                                {submission.email}
                              </a>
                            </TableCell>
                            <TableCell>
                              <a href={`tel:${submission.phone}`} className="text-primary hover:underline">
                                {submission.phone}
                              </a>
                            </TableCell>
                            <TableCell>{submission.city || "-"}</TableCell>
                            <TableCell>{getStatusBadge(submission.status)}</TableCell>
                            <TableCell>
                              {submission.attachment_url ? (
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <ImageIcon className="w-4 h-4" /> Yes
                                </span>
                              ) : (
                                <span className="text-muted-foreground">No</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openSubmissionDetail(submission)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteSubmission(submission.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Submission Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedSubmission && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  Submission Details
                  {getStatusBadge(selectedSubmission.status)}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <Label className="text-muted-foreground text-sm">Date</Label>
                  <p className="font-medium">
                    {new Date(selectedSubmission.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Full Name</Label>
                  <p className="font-medium">{selectedSubmission.full_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Email</Label>
                  <p>
                    <a href={`mailto:${selectedSubmission.email}`} className="text-primary hover:underline">
                      {selectedSubmission.email}
                    </a>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Phone</Label>
                  <p>
                    <a href={`tel:${selectedSubmission.phone}`} className="text-primary hover:underline">
                      {selectedSubmission.phone}
                    </a>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">City</Label>
                  <p className="font-medium">{selectedSubmission.city || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Message</Label>
                  <p className="whitespace-pre-wrap bg-muted p-3 rounded-lg text-sm">
                    {selectedSubmission.message || "-"}
                  </p>
                </div>

                {/* ID Images */}
                {getAttachmentPaths(selectedSubmission).length > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-sm">ID Images</Label>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      {getAttachmentPaths(selectedSubmission).map((path, index) => {
                        const url = signedUrls[path];
                        const isLoading = loadingImages[path];
                        
                        return (
                          <div key={index} className="space-y-2">
                            <div 
                              className="relative aspect-square rounded-lg overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity bg-muted"
                              onClick={() => url && setImagePreview(url)}
                            >
                              {isLoading ? (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                                </div>
                              ) : url ? (
                                <img
                                  src={url}
                                  alt={`ID ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <ImageIcon className="w-8 h-8" />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground truncate flex-1">
                                {getAttachmentNames(selectedSubmission)[index] || `ID ${index + 1}`}
                              </p>
                              {url && (
                                <a
                                  href={url}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="space-y-3 pt-4 border-t">
                  {selectedSubmission.status !== "reviewed" && (
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => handleMarkAsReviewed(selectedSubmission.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Reviewed
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleDeleteSubmission(selectedSubmission.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Submission
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Image Preview Modal */}
      {imagePreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setImagePreview(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setImagePreview(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={imagePreview}
            alt="ID Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
