import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageCropModal } from "./ImageCropModal";
import { ProfileAvatar } from "./ProfileAvatar";
import {
  PROFILE_MEDIA_ACCEPT,
  PROFILE_MEDIA_BUCKET,
  PROFILE_MEDIA_IMAGE_MIME,
  PROFILE_MEDIA_VIDEO_MIME,
  detectMediaType,
  humanSize,
  invalidateProfileMediaCache,
  maxSizeForRole,
} from "@/lib/profileMedia";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  userName: string | null;
  onAvatarUpdate: (url: string, mediaType: "image" | "video") => void;
  role?: string | null;
  currentMediaType?: "image" | "video" | null;
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  userName,
  onAvatarUpdate,
  role,
  currentMediaType,
}: AvatarUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const maxBytes = maxSizeForRole(role);
  const isInstructor = role === "instructor" || role === "admin" || role === "staff";
  const limitLabel = isInstructor ? "50MB" : "10MB";

  const uploadBlob = async (blob: Blob, ext: string, mediaType: "image" | "video") => {
    setUploading(true);
    setProgress(10);
    try {
      const path = `${userId}/avatar_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(PROFILE_MEDIA_BUCKET)
        .upload(path, blob, {
          contentType: blob.type || (mediaType === "video" ? `video/${ext}` : `image/${ext}`),
          upsert: true,
        });
      setProgress(70);
      if (uploadError) throw uploadError;

      // Best-effort cleanup: remove any prior profile-media file for this user
      try {
        const { data: existing } = await supabase.storage
          .from(PROFILE_MEDIA_BUCKET)
          .list(userId);
        const toDelete = (existing || [])
          .filter((f) => `${userId}/${f.name}` !== path)
          .map((f) => `${userId}/${f.name}`);
        if (toDelete.length > 0) {
          await supabase.storage.from(PROFILE_MEDIA_BUCKET).remove(toDelete);
        }
      } catch {
        /* ignore */
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: path, avatar_media_type: mediaType } as any)
        .eq("id", userId);
      if (updateError) throw updateError;

      invalidateProfileMediaCache();
      setProgress(100);
      onAvatarUpdate(path, mediaType);
      toast({
        title: "Profile media updated",
        description: `Your profile ${mediaType} has been saved.`,
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error?.message || "Failed to upload profile media.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const handleUploadCroppedImage = async (croppedBlob: Blob) => {
    setCropModalOpen(false);
    setSelectedImage(null);
    await uploadBlob(croppedBlob, "png", "image");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const kind = detectMediaType(file);
    if (!kind) {
      toast({
        title: "Unsupported file",
        description: "Please select an image or video.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    // Mime allow-list
    const allowed =
      kind === "image"
        ? PROFILE_MEDIA_IMAGE_MIME.includes(file.type) || file.type === ""
        : PROFILE_MEDIA_VIDEO_MIME.includes(file.type) || file.type === "";
    if (!allowed) {
      toast({
        title: "Unsupported format",
        description: `Please pick a supported ${kind} format (JPEG, PNG, WEBP, HEIC, MP4, MOV, WEBM).`,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    if (file.size > maxBytes) {
      toast({
        title: "File too large",
        description: `Your ${kind} is ${humanSize(file.size)}. The limit is ${limitLabel}.`,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    if (kind === "video") {
      // Upload directly, no cropping for videos
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      uploadBlob(file, ext, "video");
    } else {
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      setCropModalOpen(true);
    }
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
      <ProfileAvatar
        avatarUrl={currentAvatarUrl}
        mediaType={currentMediaType || "image"}
        name={userName}
        className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-primary/20"
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground w-full max-w-xs">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading… {progress}%
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] w-full sm:w-auto gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload Photo or Video
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
          <p className="text-xs text-muted-foreground text-center">
            Up to {limitLabel} — image or video. Videos loop silently.
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={PROFILE_MEDIA_ACCEPT}
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

      {selectedImage && (
        <ImageCropModal
          open={cropModalOpen}
          imageSrc={selectedImage}
          onClose={handleCropClose}
          onSave={handleUploadCroppedImage}
        />
      )}
    </div>
  );
}
