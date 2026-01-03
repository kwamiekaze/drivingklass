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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Trash2,
  Search,
  ChevronDown,
  MessageSquare,
  Send,
  Eye,
  TestTube
} from 'lucide-react';
import { Lead, LeadNote, LeadStatus, ParsedLeadData } from '@/types/leads';
import { parseLeadData, getMissingFields, SAMPLE_RAW_DATA, testParser } from '@/lib/leadParser';
import { format } from 'date-fns';

// Helper component for inline field warnings
function FieldHint({ value, fieldLabel }: { value: string; fieldLabel: string }) {
  if (value && value.trim()) return null;
  return (
    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      Not detected — please type to continue
    </p>
  );
}

export default function AdminLeads() {
  return (
    <ProtectedRoute allowedRoles={['staff', 'admin']}>
      <PortalLayout>
        <AdminLeadsContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200' },
  { value: 'converted', label: 'Converted', color: 'bg-green-500/10 text-green-600 border-green-200' },
  { value: 'closed', label: 'Closed', color: 'bg-muted text-muted-foreground border-muted' },
];

function AdminLeadsContent() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Paste parser state
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedLeadData | null>(null);
  const [editableData, setEditableData] = useState<ParsedLeadData | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Lead details state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadNotes, setLeadNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setLeads(data as unknown as Lead[]);
    }
    setLoading(false);
  };

  const fetchLeadNotes = async (leadId: string) => {
    const { data } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (data) {
      // Fetch author names separately
      const notesWithAuthors = await Promise.all(
        data.map(async (note) => {
          let authorName: string | null = null;
          if (note.author_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', note.author_id)
              .maybeSingle();
            authorName = profile?.full_name || null;
          }
          return {
            ...note,
            author: { full_name: authorName }
          } as LeadNote;
        })
      );
      setLeadNotes(notesWithAuthors);
    }
  };

  const handleOpenDetails = async (lead: Lead) => {
    setSelectedLead(lead);
    setDetailsOpen(true);
    await fetchLeadNotes(lead.id);
  };

  const handleAddNote = async () => {
    if (!selectedLead || !newNote.trim()) return;
    
    setSavingNote(true);
    const { data: userData } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('lead_notes')
      .insert({
        lead_id: selectedLead.id,
        author_id: userData?.user?.id,
        note: newNote.trim(),
      });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Note Added' });
      setNewNote('');
      await fetchLeadNotes(selectedLead.id);
    }
    setSavingNote(false);
  };

  const handleUpdateStatus = async (leadId: string, status: LeadStatus) => {
    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', leadId);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Status Updated' });
      fetchLeads();
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status });
      }
    }
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

  const handleLoadSample = () => {
    setRawText(SAMPLE_RAW_DATA);
    toast({ title: 'Sample Loaded', description: 'Click "Parse Data" to extract fields' });
  };

  const handleFieldChange = (field: keyof ParsedLeadData, value: string) => {
    if (!editableData) return;
    
    const updated = { ...editableData, [field]: value };
    setEditableData(updated);
    setMissingFields(getMissingFields(updated));
  };

  const handleRunTest = () => {
    const { passed, results } = testParser();
    console.log('Parser Test Results:', results);
    
    if (passed) {
      toast({ 
        title: 'Parser Test Passed ✅', 
        description: 'All fields extracted correctly',
      });
    } else {
      const failedFields = Object.entries(results)
        .filter(([_, r]) => !r.match)
        .map(([key]) => key);
      toast({ 
        title: 'Parser Test Failed ❌', 
        description: `Failed fields: ${failedFields.join(', ')}`,
        variant: 'destructive'
      });
    }
  };

  const handleSaveLead = async () => {
    if (!editableData) return;
    
    // Require: Full Name + (Phone OR Email)
    if (!editableData.full_name) {
      toast({ 
        title: 'Missing required fields', 
        description: 'Full Name is required', 
        variant: 'destructive' 
      });
      return;
    }
    
    if (!editableData.phone && !editableData.email) {
      toast({ 
        title: 'Missing required fields', 
        description: 'Phone or Email is required', 
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
        status: 'new',
      });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Lead Created', description: 'Lead has been saved successfully' });
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
      if (selectedLead?.id === id) {
        setDetailsOpen(false);
        setSelectedLead(null);
      }
    }
  };

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSearch = !searchQuery || 
      lead.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.includes(searchQuery) ||
      lead.permit_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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
                  {filteredLeads.length}
                </span>
                All Leads
              </CardTitle>
              
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, phone, permit..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 min-h-[44px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40 min-h-[44px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredLeads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{leads.length === 0 ? 'No leads yet' : 'No leads match your filters'}</p>
                  {leads.length === 0 && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setActiveTab('add')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Lead
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLeads.map((lead) => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      onOpen={() => handleOpenDetails(lead)}
                      onDelete={() => handleDeleteLead(lead.id)}
                      onStatusChange={(status) => handleUpdateStatus(lead.id, status)}
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
                  placeholder={`Paste raw data here...

Supported formats:
Name: John Doe
Email: john@example.com
Phone: (555) 123-4567
...`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="min-h-[280px] font-mono text-sm"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline"
                    onClick={handleLoadSample} 
                    className="flex-1 min-h-[44px] gap-2"
                  >
                    <TestTube className="h-4 w-4" />
                    Load Sample
                  </Button>
                  <Button 
                    onClick={handleParse} 
                    className="flex-1 min-h-[44px] gap-2"
                    disabled={!rawText.trim()}
                  >
                    <FileText className="h-4 w-4" />
                    Parse Data
                  </Button>
                </div>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={handleRunTest} 
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  <TestTube className="h-3 w-3 mr-1" />
                  Run Parser Test
                </Button>
              </CardContent>
            </Card>

            {/* Parsed Preview */}
            <Card className="portal-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="h-5 w-5" />
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
                  <ScrollArea className="h-[500px] pr-4">
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
                          <p className="text-sm font-medium mb-3">Parent/Guardian/Emergency Contact</p>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-1">
                              <Label htmlFor="guardian_name" className="text-sm">Name</Label>
                              <Input
                                id="guardian_name"
                                value={editableData.guardian_name}
                                onChange={(e) => handleFieldChange('guardian_name', e.target.value)}
                                className="min-h-[44px]"
                              />
                              <FieldHint value={editableData.guardian_name} fieldLabel="Parent Name" />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="guardian_phone" className="text-sm">Phone</Label>
                              <Input
                                id="guardian_phone"
                                value={editableData.guardian_phone}
                                onChange={(e) => handleFieldChange('guardian_phone', e.target.value)}
                                className="min-h-[44px]"
                              />
                              <FieldHint value={editableData.guardian_phone} fieldLabel="Parent Phone" />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="guardian_email" className="text-sm">Email</Label>
                              <Input
                                id="guardian_email"
                                type="email"
                                value={editableData.guardian_email}
                                onChange={(e) => handleFieldChange('guardian_email', e.target.value)}
                                className="min-h-[44px]"
                              />
                              <FieldHint value={editableData.guardian_email} fieldLabel="Parent Email" />
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4 space-y-4">
                          <div className="space-y-1">
                            <Label htmlFor="home_address" className="text-sm">Home Address</Label>
                            <Input
                              id="home_address"
                              value={editableData.home_address}
                              onChange={(e) => handleFieldChange('home_address', e.target.value)}
                              className="min-h-[44px]"
                            />
                            <FieldHint value={editableData.home_address} fieldLabel="Home Address" />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="pickup_locations" className="text-sm">Pick-up Locations</Label>
                            <Textarea
                              id="pickup_locations"
                              value={editableData.pickup_locations}
                              onChange={(e) => handleFieldChange('pickup_locations', e.target.value)}
                              placeholder="School, Library, etc."
                              className="min-h-[80px]"
                            />
                            <FieldHint value={editableData.pickup_locations} fieldLabel="Pickup Locations" />
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
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Lead Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="text-xl">{selectedLead.full_name || 'Unknown Lead'}</SheetTitle>
                <SheetDescription>
                  Added {format(new Date(selectedLead.created_at), 'MMM d, yyyy h:mm a')}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6">
                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <Select 
                    value={selectedLead.status || 'new'} 
                    onValueChange={(value) => handleUpdateStatus(selectedLead.id, value as LeadStatus)}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    {selectedLead.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">
                          {selectedLead.email}
                        </a>
                      </div>
                    )}
                    {selectedLead.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${selectedLead.phone}`} className="text-primary hover:underline">
                          {selectedLead.phone}
                        </a>
                      </div>
                    )}
                    {selectedLead.home_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span>{selectedLead.home_address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Permit Info */}
                {(selectedLead.permit_number || selectedLead.permit_issue_date || selectedLead.permit_expiration_date) && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Permit Information</h4>
                    <div className="space-y-2 text-sm">
                      {selectedLead.permit_number && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>Permit #: {selectedLead.permit_number}</span>
                        </div>
                      )}
                      {selectedLead.permit_issue_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Issued: {format(new Date(selectedLead.permit_issue_date), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      {selectedLead.permit_expiration_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Expires: {format(new Date(selectedLead.permit_expiration_date), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Guardian Info */}
                {(selectedLead.guardian_name || selectedLead.guardian_phone || selectedLead.guardian_email) && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Parent/Guardian</h4>
                    <div className="space-y-2 text-sm">
                      {selectedLead.guardian_name && <p>{selectedLead.guardian_name}</p>}
                      {selectedLead.guardian_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${selectedLead.guardian_phone}`} className="text-primary hover:underline">
                            {selectedLead.guardian_phone}
                          </a>
                        </div>
                      )}
                      {selectedLead.guardian_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${selectedLead.guardian_email}`} className="text-primary hover:underline">
                            {selectedLead.guardian_email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pickup Locations */}
                {selectedLead.pickup_locations && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Pick-up Locations</h4>
                    <p className="text-sm whitespace-pre-line">{selectedLead.pickup_locations}</p>
                  </div>
                )}

                {/* Notes Section */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Notes
                  </h4>
                  
                  {/* Add Note */}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[60px] flex-1"
                    />
                    <Button
                      size="icon"
                      onClick={handleAddNote}
                      disabled={savingNote || !newNote.trim()}
                      className="h-[60px] w-10 shrink-0"
                    >
                      {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* Notes List */}
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {leadNotes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
                    ) : (
                      leadNotes.map(note => (
                        <div key={note.id} className="p-3 bg-muted/50 rounded-lg text-sm">
                          <p className="whitespace-pre-line">{note.note}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {note.author?.full_name || 'Unknown'} • {format(new Date(note.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Raw Text Collapsible */}
                {selectedLead.raw_text && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary w-full">
                      <ChevronDown className="h-4 w-4" />
                      View Raw Data
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <pre className="p-3 bg-muted/50 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                        {selectedLead.raw_text}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Delete Button */}
                <Button
                  variant="destructive"
                  className="w-full min-h-[44px]"
                  onClick={() => handleDeleteLead(selectedLead.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Lead
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface LeadCardProps {
  lead: Lead;
  onOpen: () => void;
  onDelete: () => void;
  onStatusChange: (status: LeadStatus) => void;
}

function LeadCard({ lead, onOpen, onDelete, onStatusChange }: LeadCardProps) {
  const statusConfig = STATUS_OPTIONS.find(s => s.value === lead.status) || STATUS_OPTIONS[0];

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-xl bg-background/50 hover:bg-muted/30 transition-colors">
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
        <div className="flex items-center gap-2 shrink-0">
          <Select value={lead.status || 'new'} onValueChange={(val) => onStatusChange(val as LeadStatus)}>
            <SelectTrigger className={`h-7 text-xs border px-2 ${statusConfig.color}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

      <div className="flex items-center justify-between gap-2 pt-2 border-t">
        <span className="text-xs text-muted-foreground">
          Added {format(new Date(lead.created_at), 'MMM d, yyyy')}
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={onOpen}
          >
            <Eye className="h-3 w-3 mr-1" />
            Open
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}