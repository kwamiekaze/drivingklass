import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProfileAvatar } from "@/components/portal/ProfileAvatar";
import { resolveProfileMediaUrl } from "@/lib/profileMedia";
import { getDisplayName } from "@/lib/profileUtils";
import { User } from "lucide-react";
import type { Profile } from "@/types/portal";

interface InstructorProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructor: Partial<Profile> | null;
}

export function InstructorProfileModal({ open, onOpenChange, instructor }: InstructorProfileModalProps) {
  const stored = (instructor as any)?.avatar_url ?? null;
  const type: "image" | "video" =
    (instructor as any)?.avatar_media_type === "video" ? "video" : "image";
  const zoom = Number((instructor as any)?.avatar_zoom ?? 1) || 1;
  const px = Number((instructor as any)?.avatar_pos_x ?? 50);
  const py = Number((instructor as any)?.avatar_pos_y ?? 50);
  const [resolved, setResolved] = useState<string | null>(
    stored && /^https?:\/\//i.test(stored) ? stored : null
  );

  useEffect(() => {
    let cancelled = false;
    if (!stored) {
      setResolved(null);
      return;
    }
    if (/^https?:\/\//i.test(stored)) {
      setResolved(stored);
      return;
    }
    resolveProfileMediaUrl(stored).then((url) => {
      if (!cancelled) setResolved(url);
    });
    return () => {
      cancelled = true;
    };
  }, [stored, open]);

  const name = getDisplayName(instructor, "Instructor");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Your Instructor</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="w-64 h-64 max-w-full rounded-2xl overflow-hidden bg-muted flex items-center justify-center border border-border/40 shadow-lg">
            {resolved && type === "video" ? (
              <video
                src={resolved}
                className="w-full h-full"
                style={{
                  objectFit: "cover",
                  objectPosition: `${px}% ${py}%`,
                  transform: `scale(${zoom})`,
                  transformOrigin: "center",
                }}
                autoPlay
                muted
                loop
                playsInline
                disablePictureInPicture
                preload="metadata"
              />
            ) : resolved ? (
              <img src={resolved} alt={name} className="w-full h-full object-cover" />
            ) : (
              <User className="h-24 w-24 text-muted-foreground" />
            )}
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold theme-heading">{name}</p>
            <p className="text-sm text-muted-foreground mt-1">Certified Instructor</p>
          </div>
          <ProfileAvatar profile={instructor as Profile} className="hidden" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
