import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { AvatarUpload } from "@/components/portal/AvatarUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Upload, Camera, AlertCircle } from "lucide-react";
import { z } from "zod";

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

export default function IntakeForm() {
  return (
    <ProtectedRoute allowedRoles={['student']} requireApproval={false}>
      <PortalLayout>
        <IntakeFormContent />
      </PortalLayout>
    </ProtectedRoute>
  );
}

function IntakeFormContent() {
  const { profile, user, isIntakeSubmitted, isApproved, refetchProfile } = usePortalAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [permitPreview, setPermitPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
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

  // If already approved, redirect to profile
  if (isApproved) {
    navigate('/profile', { replace: true });
    return null;
  }

  // If intake already submitted, redirect to pending-approval
  if (isIntakeSubmitted) {
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
    if (!user) return;

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

    if (!permitFile && !profile?.permit_file_url) {
      toast({
        title: "Permit Required",
        description: "Please upload a photo of your learner's permit",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let permitUrl = profile?.permit_file_url;

      // Upload permit file if selected
      if (permitFile) {
        const fileExt = permitFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('permits')
          .upload(fileName, permitFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('permits')
          .getPublicUrl(fileName);
        
        permitUrl = urlData.publicUrl;
      }

      // Update profile with all intake data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
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
          intake_submitted: true,
          approval_status: 'pending',
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Create notification for admin/staff
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

      await refetchProfile();
      
      toast({
        title: "Intake Form Submitted",
        description: "Your intake form has been submitted. You'll be notified once approved.",
      });

      navigate('/pending-approval', { replace: true });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit intake form",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold theme-heading">Student Intake Form</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Complete your intake form to get started with driving lessons
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Please complete all required fields and upload your permit to be approved for lessons.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Profile Picture */}
        <Card className="portal-card">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Profile Picture <span className="text-muted-foreground font-normal">(Optional)</span></CardTitle>
            <CardDescription className="text-xs sm:text-sm">Upload or take a photo for your profile</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {user && (
              <AvatarUpload
                userId={user.id}
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
                  value={user?.email || ''}
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
              <Label className="text-sm">Permit Photo *</Label>
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
                  Choose File
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
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Preview:</p>
                  <img 
                    src={permitPreview} 
                    alt="Permit preview" 
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
              Submitting...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Submit Intake Form
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
