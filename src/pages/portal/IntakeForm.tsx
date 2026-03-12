import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { AvatarUpload } from "@/components/portal/AvatarUpload";
import { SubmissionDebugPanel, useSubmissionDebug, DebugLogEntry } from "@/components/portal/SubmissionDebugPanel";
import { createSignedPermitUrl } from "@/lib/permitDocuments";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Upload, Camera, AlertCircle, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useFormDraft, FileRestoreNotice } from "@/hooks/useFormDraft";

const intakeFormSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(50),
  last_name: z.string().min(1, "Last name is required").max(50),
  phone: z.string().min(10, "Phone number is required").max(20),
  pickup_address: z.string().min(5, "Pickup address is required").max(500),
  dropoff_address: z.string().min(5, "Drop-off address is required").max(500),
  permit_number: z.string().min(3, "Permit number is required").max(50),
  permit_issue_date: z.string().min(1, "Issue date is required"),
  permit_expiration_date: z.string().min(1, "Expiration date is required"),
  guardian_name: z.string().min(2, "Guardian name is required").max(100),
  guardian_phone: z.string().min(10, "Guardian phone is required").max(20),
  guardian_email: z.string().email("Invalid guardian email").max(255).optional().or(z.literal('')),
});

// Wrapper for student-only access (new intake submissions)
export default function IntakeForm() {
  return (
    <ProtectedRoute allowedRoles={['student']} requireApproval={false}>
      <PortalLayout>
        <IntakeFormContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

// Admin/Staff intake editing wrapper
export function AdminIntakeEdit() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'staff']}>
      <PortalLayout>
        <IntakeFormContent isAdminEdit />
      </PortalLayout>
    </ProtectedRoute>
  );
}

interface IntakeFormContentProps {
  isAdminEdit?: boolean;
}

function IntakeFormContent({ isAdminEdit = false }: IntakeFormContentProps) {
  const { profile, user, isIntakeSubmitted, isApproved, refetchProfile, role } = usePortalAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Check if we're in edit mode
  const editUserId = searchParams.get('userId');
  const isEditMode = isAdminEdit ? !!editUserId : isIntakeSubmitted;
  const targetUserId = isAdminEdit ? editUserId : user?.id;
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [permitPreview, setPermitPreview] = useState<string | null>(null);
  const [existingPermitUrl, setExistingPermitUrl] = useState<string | null>(null);
  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [fileRestoreNeeded, setFileRestoreNeeded] = useState(false);
  
  // Debug panel state
  const { logs: debugLogs, addLog, updateLastLog, clearLogs } = useSubmissionDebug();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    pickup_address: '',
    dropoff_address: '',
    permit_number: '',
    permit_issue_date: '',
    permit_expiration_date: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
  });

  const [availabilityDays, setAvailabilityDays] = useState<string[]>([]);
  const [availabilityWindows, setAvailabilityWindows] = useState<string[]>([]);
  const [availabilityNotes, setAvailabilityNotes] = useState('');

  // Form draft hook - only enable for new intake (not admin edit or edit mode with server data)
  const draftEnabled = !isAdminEdit && !isFetchingProfile;
  const { clearDraft } = useFormDraft({
    formName: 'intake',
    values: formData,
    setValue: (values) => setFormData(values),
    userId: user?.id,
    routePath: '/intake',
    serverTimestamp: targetProfile?.intake_updated_at,
    fileInfo: {
      hasFile: !!permitFile,
      fileName: permitFile?.name,
    },
    onFileRestoreNeeded: () => setFileRestoreNeeded(true),
    enabled: draftEnabled,
  });

  // Fetch target user's profile for admin edit or prefill for user's own edit
  useEffect(() => {
    const fetchTargetProfile = async () => {
      const idToFetch = isAdminEdit ? editUserId : user?.id;
      if (!idToFetch) return;
      
      setIsFetchingProfile(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', idToFetch)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Could not load user profile",
          variant: "destructive",
        });
        setIsFetchingProfile(false);
        return;
      }
      
      if (data) {
        setTargetProfile(data);
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          pickup_address: data.pickup_address || '',
          dropoff_address: data.dropoff_address || '',
          permit_number: data.permit_number || '',
          permit_issue_date: data.permit_issue_date || '',
          permit_expiration_date: data.permit_expiration_date || '',
          guardian_name: data.guardian_name || '',
          guardian_phone: data.guardian_phone || '',
          guardian_email: data.guardian_email || '',
        });
        setExistingPermitUrl(data.permit_file_url);
        setAvatarUrl(data.avatar_url);
      }
      
      setIsFetchingProfile(false);
    };

    // For admin edit, always fetch the target profile
    // For user edit mode, fetch their profile data
    if (isAdminEdit || isEditMode) {
      fetchTargetProfile();
    } else if (profile && !isEditMode) {
      // New submission - prefill from existing profile data
      setFormData({
        first_name: (profile as any)?.first_name || '',
        last_name: (profile as any)?.last_name || '',
        phone: profile?.phone || '',
        pickup_address: profile?.pickup_address || '',
        dropoff_address: profile?.dropoff_address || '',
        permit_number: profile?.permit_number || '',
        permit_issue_date: profile?.permit_issue_date || '',
        permit_expiration_date: profile?.permit_expiration_date || '',
        guardian_name: profile?.guardian_name || '',
        guardian_phone: profile?.guardian_phone || '',
        guardian_email: profile?.guardian_email || '',
      });
      setExistingPermitUrl(profile?.permit_file_url || null);
    }
  }, [isAdminEdit, editUserId, user?.id, profile, isEditMode]);

  // For students: redirect if approved and not in edit mode
  if (!isAdminEdit && isApproved && !isEditMode) {
    navigate('/profile', { replace: true });
    return null;
  }

  // For students: redirect to pending-approval if already submitted and not in edit mode
  // But allow access if they want to edit their submitted intake
  if (!isAdminEdit && isIntakeSubmitted && !isEditMode && !searchParams.get('edit')) {
    navigate('/pending-approval', { replace: true });
    return null;
  }

  const handleAvatarUpdate = (url: string) => {
    setAvatarUrl(url);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file under 5MB",
          variant: "destructive",
        });
        return;
      }
      setPermitFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPermitPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearLogs();
    
    // CRITICAL: Block submit if not authenticated
    if (!user?.id) {
      addLog({
        table: 'auth',
        operation: 'select',
        status: 'error',
        error: { message: 'You must be signed in to submit the intake form' },
      });
      toast({
        title: "Not Authenticated",
        description: "You must be signed in to submit the intake form",
        variant: "destructive",
      });
      return;
    }
    
    if (!targetUserId) {
      addLog({
        table: 'profiles',
        operation: 'update',
        status: 'error',
        error: { message: 'Target user ID is missing' },
      });
      return;
    }

    const validation = intakeFormSchema.safeParse(formData);
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      toast({
        title: "Validation Error",
        description: "Please fix the errors below",
        variant: "destructive",
      });
      return;
    }

    // Only require permit for new submissions
    if (!isEditMode && !permitFile && !existingPermitUrl) {
      toast({
        title: "Permit Required",
        description: "Please upload a photo of your learner's permit",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get current profile data for revision snapshot
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      // Create revision snapshot BEFORE updating (preserve history)
      if (isEditMode && currentProfile) {
        const snapshotJson = {
          first_name: currentProfile.first_name,
          last_name: currentProfile.last_name,
          phone: currentProfile.phone,
          pickup_address: currentProfile.pickup_address,
          dropoff_address: currentProfile.dropoff_address,
          permit_number: currentProfile.permit_number,
          permit_issue_date: currentProfile.permit_issue_date,
          permit_expiration_date: currentProfile.permit_expiration_date,
          guardian_name: currentProfile.guardian_name,
          guardian_phone: currentProfile.guardian_phone,
          guardian_email: currentProfile.guardian_email,
          permit_file_url: currentProfile.permit_file_url,
          captured_at: new Date().toISOString(),
        };

        await supabase
          .from('intake_form_revisions')
          .insert({
            user_id: targetUserId,
            edited_by: user?.id,
            edited_by_role: role,
            snapshot_json: snapshotJson,
            note: isAdminEdit ? 'Edited by admin/staff' : 'Edited by user',
          });
      }

      let permitUrl = existingPermitUrl;
      let uploadedFilePath: string | null = null;

      // Upload permit file if selected
      if (permitFile) {
        const fileExt = permitFile.name.split('.').pop();
        const fileName = `${targetUserId}/${Date.now()}.${fileExt}`;
        
        addLog({
          table: 'storage.permits',
          operation: 'upload',
          status: 'pending',
          payload: { bucket: 'permits', file_path: fileName, file_name: permitFile.name },
        });
        
        const { error: uploadError } = await supabase.storage
          .from('permits')
          .upload(fileName, permitFile);

        if (uploadError) {
          updateLastLog({
            status: 'error',
            error: { 
              message: uploadError.message, 
              code: (uploadError as any).statusCode?.toString(),
            },
          });
          throw uploadError;
        }
        
        updateLastLog({ status: 'success' });
        uploadedFilePath = fileName;

        // Generate signed URL for display (not public URL since bucket is private)
        const signedResult = await createSignedPermitUrl({
          bucket: 'permits',
          storagePath: fileName,
          expiresInSeconds: 600,
        });
        
        if (signedResult.ok) {
          permitUrl = signedResult.signedUrl;
        }
        
        // Upsert permit_documents table - CRITICAL for admin visibility
        const permitDocPayload = {
          student_id: targetUserId, // ALWAYS use targetUserId (auth.uid() for students)
          uploaded_by: user?.id,
          bucket: 'permits',
          file_path: fileName,
          file_name: permitFile.name,
          mime_type: permitFile.type || 'image/jpeg',
          size_bytes: permitFile.size,
          source: 'intake_form',
          status: 'pending_review',
        };
        
        addLog({
          table: 'permit_documents',
          operation: 'upsert',
          status: 'pending',
          payload: permitDocPayload,
        });
        
        const { error: permitDocError } = await supabase
          .from('permit_documents')
          .upsert(permitDocPayload, {
            onConflict: 'student_id,source',
            ignoreDuplicates: false,
          });
          
        if (permitDocError) {
          updateLastLog({
            status: 'error',
            error: {
              message: permitDocError.message,
              code: permitDocError.code,
              details: permitDocError.details,
              hint: permitDocError.hint,
            },
          });
          // Don't throw - permit is already uploaded, just log the error
          console.error('Failed to upsert permit_documents:', permitDocError);
        } else {
          updateLastLog({ status: 'success' });
        }
      }

      // Prepare update data
      const updateData: Record<string, any> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        phone: formData.phone,
        pickup_address: formData.pickup_address,
        dropoff_address: formData.dropoff_address,
        permit_number: formData.permit_number,
        permit_issue_date: formData.permit_issue_date,
        permit_expiration_date: formData.permit_expiration_date,
        guardian_name: formData.guardian_name,
        guardian_phone: formData.guardian_phone,
        guardian_email: formData.guardian_email,
        permit_file_url: permitUrl,
        intake_updated_at: new Date().toISOString(),
        intake_updated_by: user?.id,
        intake_last_edit_role: role,
      };

      // For new submissions
      if (!isEditMode) {
        updateData.intake_submitted = true;
        updateData.approval_status = 'pending';
        updateData.intake_edit_count = 0;
      } else {
        // For edits, increment edit count and potentially flag for review
        updateData.intake_edit_count = (currentProfile?.intake_edit_count || 0) + 1;
        
        // If user (not admin) edits an approved intake, flag for review
        if (!isAdminEdit && currentProfile?.approval_status === 'approved') {
          updateData.needs_review = true;
        }
      }

      // Update profile
      addLog({
        table: 'profiles',
        operation: 'update',
        status: 'pending',
        payload: { id: targetUserId, ...updateData },
      });
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', targetUserId);

      if (updateError) {
        updateLastLog({
          status: 'error',
          error: {
            message: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint,
          },
        });
        throw updateError;
      }
      
      updateLastLog({ status: 'success' });

      // Send notifications
      if (isEditMode) {
        if (isAdminEdit) {
          // Notify the user that admin/staff edited their intake
          await supabase.from('notifications').insert({
            user_id: targetUserId,
            title: 'Intake Form Updated',
            message: 'Your intake form was updated by staff.',
            type: 'system',
          });
        } else {
          // Notify admin/staff that user edited their intake
          const { data: staffUsers } = await supabase
            .from('user_roles')
            .select('user_id')
            .in('role', ['admin', 'staff']);

          if (staffUsers && staffUsers.length > 0) {
            const notifications = staffUsers.map(su => ({
              user_id: su.user_id,
              title: 'Intake Form Updated',
              message: `${formData.first_name} ${formData.last_name} has updated their intake form.${currentProfile?.approval_status === 'approved' ? ' (Review recommended)' : ''}`,
              type: 'intake_submitted',
            }));

            await supabase.from('notifications').insert(notifications);
          }
        }
      } else {
        // New submission - notify admin/staff
        const { data: staffUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['admin', 'staff']);

        if (staffUsers && staffUsers.length > 0) {
          const notifications = staffUsers.map(su => ({
            user_id: su.user_id,
            title: 'New Intake Submission',
            message: `${formData.first_name} ${formData.last_name} has submitted their intake form and is awaiting approval.`,
            type: 'intake_submitted',
          }));

          await supabase.from('notifications').insert(notifications);
        }
      }

      await refetchProfile();
      
      // Clear draft on successful submission
      clearDraft();
      
      toast({
        title: isEditMode ? "Intake Form Updated" : "Intake Form Submitted",
        description: isEditMode 
          ? "Your changes have been saved successfully." 
          : "Your intake form has been submitted. You'll be notified once approved.",
      });

      // Navigate appropriately
      if (isAdminEdit) {
        navigate('/admin/approvals');
      } else if (isEditMode) {
        // User edited their own intake - go back to appropriate page
        if (isApproved) {
          navigate('/student');
        } else {
          navigate('/pending-approval');
        }
      } else {
        navigate('/pending-approval', { replace: true });
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save intake form",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingProfile) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pageTitle = isAdminEdit 
    ? `Edit Intake: ${targetProfile?.first_name || ''} ${targetProfile?.last_name || ''}`.trim() || 'Edit Intake Form'
    : isEditMode 
      ? 'Edit Your Intake Form'
      : 'Student Intake Form';

  const pageDescription = isAdminEdit
    ? 'Update this user\'s intake information'
    : isEditMode
      ? 'Update your intake information'
      : 'Complete your intake form to get started with driving lessons';

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      {/* Back button for admin edit */}
      {isAdminEdit && (
        <Button variant="ghost" asChild className="gap-2 -ml-2">
          <Link to="/admin/approvals">
            <ArrowLeft className="h-4 w-4" />
            Back to Approvals
          </Link>
        </Button>
      )}

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold theme-heading">{pageTitle}</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          {pageDescription}
        </p>
      </div>

      {!isEditMode && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Please complete all required fields and upload your permit to be approved for lessons.
          </AlertDescription>
        </Alert>
      )}

      {isEditMode && !isAdminEdit && isApproved && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Your changes will be flagged for staff review. Your account access will remain active.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Profile Picture */}
        <Card className="portal-card">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Profile Picture <span className="text-muted-foreground font-normal">(Optional)</span></CardTitle>
            <CardDescription className="text-xs sm:text-sm">Upload or take a photo for your profile</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {targetUserId && (
              <AvatarUpload
                userId={targetUserId}
                currentAvatarUrl={avatarUrl}
                userName={`${formData.first_name} ${formData.last_name}`.trim()}
                onAvatarUpdate={handleAvatarUpdate}
              />
            )}
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="portal-card">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-sm">First Name *</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder="John"
                  className="theme-input min-h-[44px]"
                  required
                />
                {errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-sm">Last Name *</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  className="theme-input min-h-[44px]"
                  required
                />
                {errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={targetProfile?.email || user?.email || ''}
                  className="theme-input min-h-[44px] bg-muted"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm">Phone *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                  className="theme-input min-h-[44px]"
                  required
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Addresses */}
        <Card className="portal-card">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Pickup & Drop-off Locations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pickup_address" className="text-sm">Pickup Address *</Label>
              <Input
                id="pickup_address"
                name="pickup_address"
                value={formData.pickup_address}
                onChange={handleInputChange}
                placeholder="123 Main St, City, State ZIP"
                className="theme-input min-h-[44px]"
                required
              />
              {errors.pickup_address && <p className="text-xs text-destructive">{errors.pickup_address}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dropoff_address" className="text-sm">Drop-off Address *</Label>
              <Input
                id="dropoff_address"
                name="dropoff_address"
                value={formData.dropoff_address}
                onChange={handleInputChange}
                placeholder="123 Main St, City, State ZIP"
                className="theme-input min-h-[44px]"
                required
              />
              {errors.dropoff_address && <p className="text-xs text-destructive">{errors.dropoff_address}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Permit Information */}
        <Card className="portal-card">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Permit/Driver's License Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="permit_number" className="text-sm">Permit Number *</Label>
                <Input
                  id="permit_number"
                  name="permit_number"
                  value={formData.permit_number}
                  onChange={handleInputChange}
                  className="theme-input min-h-[44px]"
                  required
                />
                {errors.permit_number && <p className="text-xs text-destructive">{errors.permit_number}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="permit_issue_date" className="text-sm">Issue Date *</Label>
                <Input
                  id="permit_issue_date"
                  name="permit_issue_date"
                  type="date"
                  value={formData.permit_issue_date}
                  onChange={handleInputChange}
                  className="theme-input min-h-[44px]"
                  required
                />
                {errors.permit_issue_date && <p className="text-xs text-destructive">{errors.permit_issue_date}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="permit_expiration_date" className="text-sm">Expiration Date *</Label>
                <Input
                  id="permit_expiration_date"
                  name="permit_expiration_date"
                  type="date"
                  value={formData.permit_expiration_date}
                  onChange={handleInputChange}
                  className="theme-input min-h-[44px]"
                  required
                />
                {errors.permit_expiration_date && <p className="text-xs text-destructive">{errors.permit_expiration_date}</p>}
              </div>
            </div>

            {/* Permit Upload */}
            <div className="space-y-3">
              <Label className="text-sm">Permit Photo {!isEditMode && '*'}</Label>
              <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 min-h-[44px] flex-1 xs:flex-none"
                >
                  <Upload className="h-4 w-4" />
                  {isEditMode && existingPermitUrl ? 'Replace File' : 'Choose File'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  className="gap-2 min-h-[44px] flex-1 xs:flex-none"
                >
                  <Camera className="h-4 w-4" />
                  Take Photo
                </Button>
              </div>
              
              {permitPreview ? (
                <div className="mt-4">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">New file preview:</p>
                  <img 
                    src={permitPreview} 
                    alt="Permit preview" 
                    className="max-w-full sm:max-w-xs rounded-lg border"
                  />
                </div>
              ) : existingPermitUrl ? (
                <div className="mt-4">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Current permit on file:</p>
                  <img 
                    src={existingPermitUrl} 
                    alt="Current permit" 
                    className="max-w-full sm:max-w-xs rounded-lg border"
                  />
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Please upload a clear photo of your learner's permit
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Guardian Information */}
        <Card className="portal-card">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Parent/Guardian/Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="guardian_name" className="text-sm">Name *</Label>
                <Input
                  id="guardian_name"
                  name="guardian_name"
                  value={formData.guardian_name}
                  onChange={handleInputChange}
                  placeholder="Parent/Guardian Name"
                  className="theme-input min-h-[44px]"
                  required
                />
                {errors.guardian_name && <p className="text-xs text-destructive">{errors.guardian_name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardian_phone" className="text-sm">Phone *</Label>
                <Input
                  id="guardian_phone"
                  name="guardian_phone"
                  type="tel"
                  value={formData.guardian_phone}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                  className="theme-input min-h-[44px]"
                  required
                />
                {errors.guardian_phone && <p className="text-xs text-destructive">{errors.guardian_phone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardian_email" className="text-sm">Email</Label>
                <Input
                  id="guardian_email"
                  name="guardian_email"
                  type="email"
                  value={formData.guardian_email}
                  onChange={handleInputChange}
                  placeholder="guardian@email.com"
                  className="theme-input min-h-[44px]"
                />
                {errors.guardian_email && <p className="text-xs text-destructive">{errors.guardian_email}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button type="submit" className="w-full gap-2 min-h-[48px]" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEditMode ? 'Saving...' : 'Submitting...'}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {isEditMode ? 'Save Changes' : 'Submit Intake Form'}
            </>
          )}
        </Button>
      </form>
      
      {/* Submission Debug Panel - shows for admins or when errors occur */}
      <SubmissionDebugPanel
        logs={debugLogs}
        authUid={user?.id}
        isAdmin={isAdminEdit || role === 'admin' || role === 'staff'}
      />
    </div>
  );
}
