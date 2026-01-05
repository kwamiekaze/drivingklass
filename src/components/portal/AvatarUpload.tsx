import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageCropModal } from "./ImageCropModal";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  userName: string | null;
  onAvatarUpdate: (url: string) => void;
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  userName,
  onAvatarUpdate,
}: AvatarUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleUploadCropped = async (croppedBlob: Blob) => {
    setCropModalOpen(false);
    setSelectedImage(null);
    setUploading(true);

    try {
      const fileName = `${userId}/avatar_${Date.now()}.png`;

      // Delete old avatar if exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split("/avatars/")[1];
        if (oldPath) {
          await supabase.storage.from("avatars").remove([decodeURIComponent(oldPath)]);
        }
      }

      // Upload cropped avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, croppedBlob, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL with cache-busting
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl } as any)
        .eq("id", userId);

      if (updateError) throw updateError;

      onAvatarUpdate(publicUrl);
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload avatar.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    // Create object URL and open crop modal
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setCropModalOpen(true);

    // Reset input
    e.target.value = "";
  };

  const handleCropClose = () => {
    setCropModalOpen(false);
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
      setSelectedImage(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-primary/20">
        <AvatarImage src={currentAvatarUrl || undefined} alt={userName || "User"} />
        <AvatarFallback className="text-2xl sm:text-3xl bg-primary/10 text-primary">
          {getInitials(userName)}
        </AvatarFallback>
      </Avatar>

      {uploading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading...
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full sm:w-auto gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Upload Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full sm:w-auto gap-2"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            Take Photo
          </Button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Crop Modal */}
      {selectedImage && (
        <ImageCropModal
          open={cropModalOpen}
          imageSrc={selectedImage}
          onClose={handleCropClose}
          onSave={handleUploadCropped}
        />
      )}
    </div>
  );
}
