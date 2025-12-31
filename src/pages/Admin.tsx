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
import { toast } from "sonner";
import { LogOut, Plus, Pencil, Trash2, Download, ExternalLink } from "lucide-react";
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
  created_at: string;
}

export default function Admin() {
  const { user, isLoading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      // Update existing service
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
      // Create new service
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
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No submissions yet.
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
                          <TableHead>Message</TableHead>
                          <TableHead>Attachment</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissions.map((submission) => (
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
                            <TableCell className="max-w-xs truncate">
                              {submission.message || "-"}
                            </TableCell>
                            <TableCell>
                              {submission.attachment_url ? (
                                <a
                                  href={submission.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  {submission.attachment_name || "File"}
                                </a>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteSubmission(submission.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
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
    </div>
  );
}
