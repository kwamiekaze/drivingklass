import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { ProtectedRoute } from '@/components/portal/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Plus, 
  ClipboardPaste, 
  Loader2, 
  Mail, 
  Phone, 
  MapPin,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2
} from 'lucide-react';
import { Lead, ParsedLeadData } from '@/types/leads';
import { parseLeadData, getMissingFields } from '@/lib/leadParser';
import { format } from 'date-fns';

export default function AdminLeads() {
  return (
    <ProtectedRoute allowedRoles={['staff', 'admin']}>
      <PortalLayout>
        <AdminLeadsContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function AdminLeadsContent() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  
  // Paste parser state
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedLeadData | null>(null);
  const [editableData, setEditableData] = useState<ParsedLeadData | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setLeads(data as Lead[]);
    }
    setLoading(false);
  };

  const handleParse = () => {
    if (!rawText.trim()) {
      toast({ title: 'Error', description: 'Please paste some data first', variant: 'destructive' });
      return;
    }
    
    const parsed = parseLeadData(rawText);
    setParsedData(parsed);
    setEditableData(parsed);
    setMissingFields(getMissingFields(parsed));
  };

  const handleFieldChange = (field: keyof ParsedLeadData, value: string) => {
    if (!editableData) return;
    
    const updated = { ...editableData, [field]: value };
    setEditableData(updated);
    setMissingFields(getMissingFields(updated));
  };

  const handleSaveLead = async () => {
    if (!editableData) return;
    
    // Check required fields
    if (!editableData.full_name || !editableData.phone) {
      toast({ 
        title: 'Missing required fields', 
        description: 'Name and phone are required', 
        variant: 'destructive' 
      });
      return;
    }
    
    setSaving(true);
    
    const { data: userData } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('leads')
      .insert({
        created_by: userData?.user?.id || null,
        full_name: editableData.full_name || null,
        email: editableData.email || null,
        phone: editableData.phone || null,
        permit_number: editableData.permit_number || null,
        permit_issue_date: editableData.permit_issue_date || null,
        permit_expiration_date: editableData.permit_expiration_date || null,
        guardian_name: editableData.guardian_name || null,
        guardian_phone: editableData.guardian_phone || null,
        guardian_email: editableData.guardian_email || null,
        home_address: editableData.home_address || null,
        pickup_locations: editableData.pickup_locations || null,
        raw_text: rawText,
      });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Lead Created', description: 'Lead has been saved successfully' });
      // Reset form
      setRawText('');
      setParsedData(null);
      setEditableData(null);
      setMissingFields([]);
      setActiveTab('list');
      fetchLeads();
    }
    
    setSaving(false);
  };

  const handleDeleteLead = async (id: string) => {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Lead has been deleted' });
      fetchLeads();
    }
  };

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
        <h1 className="text-2xl sm:text-3xl font-bold theme-heading">Leads</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Manage prospective student leads
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
          <TabsTrigger value="list" className="gap-1.5 text-sm">
            <Users className="h-4 w-4" />
            Leads List
          </TabsTrigger>
          <TabsTrigger value="add" className="gap-1.5 text-sm">
            <Plus className="h-4 w-4" />
            Add Lead
          </TabsTrigger>
        </TabsList>

        {/* Leads List Tab */}
        <TabsContent value="list" className="mt-4">
          <Card className="portal-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/20 text-primary text-sm font-bold">
                  {leads.length}
                </span>
                All Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No leads yet</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setActiveTab('add')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Lead
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {leads.map((lead) => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      onDelete={() => handleDeleteLead(lead.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add Lead Tab */}
        <TabsContent value="add" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Raw Paste Area */}
            <Card className="portal-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardPaste className="h-5 w-5" />
                  Paste Raw Data
                </CardTitle>
                <CardDescription className="text-sm">
                  Paste student information and it will be automatically parsed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={`Paste raw data here...\n\nExample format:\nName: John Doe\nEmail: john@example.com\nPhone: (555) 123-4567\nPermit Number: ABC123456\nPermit Issue Date: 01/15/2024\nPermit Expiration Date: 01/15/2025\nParent/Guardian Name: Jane Doe\nParent/Guardian Phone: (555) 987-6543\nParent/Guardian Email: jane@example.com\nHome Address: 123 Main St, City, State 12345\nStudent Pick-up Locations: School, Library, Home`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
                <Button 
                  onClick={handleParse} 
                  className="w-full min-h-[44px]"
                  disabled={!rawText.trim()}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Parse Data
                </Button>
              </CardContent>
            </Card>

            {/* Parsed Preview */}
            <Card className="portal-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Edit className="h-5 w-5" />
                  Preview & Edit
                </CardTitle>
                <CardDescription className="text-sm">
                  Review and correct extracted information
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!editableData ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardPaste className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Paste data and click "Parse" to preview</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Missing fields warning */}
                    {missingFields.length > 0 && (
                      <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-destructive">Missing required fields:</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {missingFields.join(', ')}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Editable Fields */}
                    <div className="grid gap-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="full_name" className="text-sm flex items-center gap-1">
                            Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="full_name"
                            value={editableData.full_name}
                            onChange={(e) => handleFieldChange('full_name', e.target.value)}
                            className="min-h-[44px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={editableData.email}
                            onChange={(e) => handleFieldChange('email', e.target.value)}
                            className="min-h-[44px]"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-sm flex items-center gap-1">
                            Phone <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="phone"
                            value={editableData.phone}
                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                            className="min-h-[44px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="permit_number" className="text-sm">Permit #</Label>
                          <Input
                            id="permit_number"
                            value={editableData.permit_number}
                            onChange={(e) => handleFieldChange('permit_number', e.target.value)}
                            className="min-h-[44px]"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="permit_issue_date" className="text-sm">Permit Issue Date</Label>
                          <Input
                            id="permit_issue_date"
                            type="date"
                            value={editableData.permit_issue_date}
                            onChange={(e) => handleFieldChange('permit_issue_date', e.target.value)}
                            className="min-h-[44px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="permit_expiration_date" className="text-sm">Permit Exp. Date</Label>
                          <Input
                            id="permit_expiration_date"
                            type="date"
                            value={editableData.permit_expiration_date}
                            onChange={(e) => handleFieldChange('permit_expiration_date', e.target.value)}
                            className="min-h-[44px]"
                          />
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <p className="text-sm font-medium mb-3">Parent/Guardian</p>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor="guardian_name" className="text-sm">Name</Label>
                            <Input
                              id="guardian_name"
                              value={editableData.guardian_name}
                              onChange={(e) => handleFieldChange('guardian_name', e.target.value)}
                              className="min-h-[44px]"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="guardian_phone" className="text-sm">Phone</Label>
                            <Input
                              id="guardian_phone"
                              value={editableData.guardian_phone}
                              onChange={(e) => handleFieldChange('guardian_phone', e.target.value)}
                              className="min-h-[44px]"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="guardian_email" className="text-sm">Email</Label>
                            <Input
                              id="guardian_email"
                              type="email"
                              value={editableData.guardian_email}
                              onChange={(e) => handleFieldChange('guardian_email', e.target.value)}
                              className="min-h-[44px]"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="home_address" className="text-sm">Home Address</Label>
                          <Input
                            id="home_address"
                            value={editableData.home_address}
                            onChange={(e) => handleFieldChange('home_address', e.target.value)}
                            className="min-h-[44px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pickup_locations" className="text-sm">Pick-up Locations</Label>
                          <Input
                            id="pickup_locations"
                            value={editableData.pickup_locations}
                            onChange={(e) => handleFieldChange('pickup_locations', e.target.value)}
                            placeholder="School, Library, etc."
                            className="min-h-[44px]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        className="flex-1 min-h-[44px]"
                        onClick={() => {
                          setParsedData(null);
                          setEditableData(null);
                          setMissingFields([]);
                        }}
                      >
                        Clear
                      </Button>
                      <Button
                        className="flex-1 min-h-[44px]"
                        onClick={handleSaveLead}
                        disabled={saving || missingFields.length > 0}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Save Lead
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface LeadCardProps {
  lead: Lead;
  onDelete: () => void;
}

function LeadCard({ lead, onDelete }: LeadCardProps) {
  return (
    <div className="flex flex-col gap-3 p-4 border rounded-xl bg-background/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm sm:text-base truncate">
            {lead.full_name || 'Unknown'}
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            {lead.email && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate max-w-[150px]">{lead.email}</span>
              </span>
            )}
            {lead.phone && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                {lead.phone}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {lead.permit_number && (
          <Badge variant="secondary" className="text-xs gap-1">
            <FileText className="h-3 w-3" />
            {lead.permit_number}
          </Badge>
        )}
        {lead.permit_expiration_date && (
          <Badge variant="outline" className="text-xs gap-1">
            <Calendar className="h-3 w-3" />
            Exp: {format(new Date(lead.permit_expiration_date), 'MM/dd/yyyy')}
          </Badge>
        )}
        {lead.guardian_name && (
          <Badge variant="outline" className="text-xs">
            Guardian: {lead.guardian_name}
          </Badge>
        )}
      </div>

      {(lead.home_address || lead.pickup_locations) && (
        <div className="text-xs text-muted-foreground flex items-start gap-1">
          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="line-clamp-1">
            {lead.home_address || lead.pickup_locations}
          </span>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Added {format(new Date(lead.created_at), 'MMM d, yyyy h:mm a')}
      </div>
    </div>
  );
}
