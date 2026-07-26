import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, Crop } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageCropModal } from "./ImageCropModal";
import { ProfileAvatar } from "./ProfileAvatar";
import { VideoFrameEditor, DEFAULT_FRAMING, type VideoFraming } from "./VideoFrameEditor";
import { compressVideoWithFraming } from "@/lib/videoCompress";
import {
  PROFILE_MEDIA_ACCEPT,
  PROFILE_MEDIA_BUCKET,
  PROFILE_MEDIA_IMAGE_MIME,
  PROFILE_MEDIA_VIDEO_MIME,
  detectMediaType,
  humanSize,
  invalidateProfileMediaCache,
  maxSizeForRole,
  resolveProfileMediaUrl,
} from "@/lib/profileMedia";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  userName: string | null;
  onAvatarUpdate: (
    url: string,
    mediaType: "image" | "video",
    framing?: VideoFraming | null
  ) => void;
  role?: string | null;
  currentMediaType?: "image" | "video" | null;
  currentFraming?: Partial<VideoFraming> | null;
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  userName,
  onAvatarUpdate,
  role,
  currentMediaType,
  currentFraming,
}: AvatarUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState<string>("Uploading");
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Video framing (new upload flow)
  const [videoEditorOpen, setVideoEditorOpen] = useState(false);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [pendingVideoUrl, setPendingVideoUrl] = useState<string | null>(null);

  // Adjust-framing flow for existing video
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustSrc, setAdjustSrc] = useState<string | null>(null);
  const [savingFraming, setSavingFraming] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const maxBytes = maxSizeForRole(role);
  const isInstructor = role === "instructor" || role === "admin" || role === "staff";
  const limitLabel = isInstructor ? "50MB" : "10MB";

  const uploadBlob = async (
    blob: Blob,
    ext: string,
    mediaType: "image" | "video",
    framing: VideoFraming | null
  ) => {
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

      const payload: Record<string, any> = {
        avatar_url: path,
        avatar_media_type: mediaType,
        avatar_zoom: mediaType === "video" ? framing?.zoom ?? null : null,
        avatar_pos_x: mediaType === "video" ? framing?.x ?? null : null,
        avatar_pos_y: mediaType === "video" ? framing?.y ?? null : null,
      };
      const { error: updateError } = await supabase
        .from("profiles")
        .update(payload as any)
        .eq("id", userId);
      if (updateError) throw updateError;

      invalidateProfileMediaCache();
      setProgress(100);
      onAvatarUpdate(path, mediaType, mediaType === "video" ? framing : null);
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
    setProgressLabel("Uploading");
    await uploadBlob(croppedBlob, "jpg", "image", null);
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
      const url = URL.createObjectURL(file);
      setPendingVideoFile(file);
      setPendingVideoUrl(url);
      setVideoEditorOpen(true);
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

  const handleVideoEditorClose = () => {
    setVideoEditorOpen(false);
    if (pendingVideoUrl) URL.revokeObjectURL(pendingVideoUrl);
    setPendingVideoUrl(null);
    setPendingVideoFile(null);
  };

  const handleVideoEditorSave = async (framing: VideoFraming) => {
    const file = pendingVideoFile;
    setVideoEditorOpen(false);
    if (pendingVideoUrl) URL.revokeObjectURL(pendingVideoUrl);
    setPendingVideoUrl(null);
    setPendingVideoFile(null);
    if (!file) return;

    setUploading(true);
    setProgressLabel("Optimizing video…");
    setProgress(5);
    const compressed = await compressVideoWithFraming(file, framing, {
      onProgress: (p) => setProgress(5 + Math.round(p * 0.55)),
    });
    setProgressLabel(compressed.compressed ? "Uploading" : "Uploading original");
    await uploadBlob(compressed.blob, compressed.ext, "video", framing);
  };

  const openAdjust = async () => {
    if (!currentAvatarUrl) return;
    if (currentMediaType !== "video") {
      toast({
        title: "Re-upload to re-crop",
        description:
          "Adjusting framing after upload is available for videos. For photos, please re-upload the image to change the crop.",
      });
      return;
    }
    const url = /^https?:\/\//i.test(currentAvatarUrl)
      ? currentAvatarUrl
      : await resolveProfileMediaUrl(currentAvatarUrl);
    if (!url) return;
    setAdjustSrc(url);
    setAdjustOpen(true);
  };

  const handleAdjustSave = async (framing: VideoFraming) => {
    setAdjustOpen(false);
    setAdjustSrc(null);
    setSavingFraming(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_zoom: framing.zoom,
          avatar_pos_x: framing.x,
          avatar_pos_y: framing.y,
        } as any)
        .eq("id", userId);
      if (error) throw error;
      onAvatarUpdate(currentAvatarUrl || "", "video", framing);
      toast({ title: "Framing updated" });
    } catch (err: any) {
      toast({
        title: "Could not save framing",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingFraming(false);
    }
  };

  const hasExisting = !!currentAvatarUrl;

  return (
    <div className="flex flex-col items-center gap-4">
      <ProfileAvatar
        avatarUrl={currentAvatarUrl}
        mediaType={currentMediaType || "image"}
        zoom={currentFraming?.zoom ?? null}
        posX={currentFraming?.x ?? null}
        posY={currentFraming?.y ?? null}
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
          {hasExisting && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-[36px] gap-2"
              onClick={openAdjust}
              disabled={savingFraming}
            >
              <Crop className="h-4 w-4" />
              {currentMediaType === "video" ? "Adjust framing" : "Re-crop photo (re-upload)"}
            </Button>
          )}
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

      {pendingVideoUrl && (
        <VideoFrameEditor
          open={videoEditorOpen}
          src={pendingVideoUrl}
          initial={DEFAULT_FRAMING}
          title="Frame Profile Video"
          onClose={handleVideoEditorClose}
          onSave={handleVideoEditorSave}
        />
      )}

      {adjustSrc && (
        <VideoFrameEditor
          open={adjustOpen}
          src={adjustSrc}
          initial={currentFraming ?? DEFAULT_FRAMING}
          title="Adjust Framing"
          onClose={() => {
            setAdjustOpen(false);
            setAdjustSrc(null);
          }}
          onSave={handleAdjustSave}
        />
      )}
    </div>
  );
}
