import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { resolveProfileMediaUrl } from "@/lib/profileMedia";
import { getProfileInitials } from "@/lib/profileUtils";
import type { Profile } from "@/types/portal";

interface ProfileAvatarProps {
  profile?: Partial<Profile> | null;
  avatarUrl?: string | null;
  mediaType?: "image" | "video" | null;
  /** Video framing overrides (falls back to profile fields, then defaults). */
  zoom?: number | null;
  posX?: number | null;
  posY?: number | null;
  name?: string | null;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  ariaLabel?: string;
}

export function ProfileAvatar({
  profile,
  avatarUrl,
  mediaType,
  zoom,
  posX,
  posY,
  name,
  className,
  onClick,
  interactive,
  ariaLabel,
}: ProfileAvatarProps) {
  const stored = avatarUrl ?? (profile as any)?.avatar_url ?? null;
  const type: "image" | "video" =
    mediaType ??
    ((profile as any)?.avatar_media_type === "video" ? "video" : "image");
  const displayName =
    name ?? profile?.full_name ?? profile?.first_name ?? "User";
  const initials = getProfileInitials(profile ?? undefined);

  const fZoom = Number(zoom ?? (profile as any)?.avatar_zoom ?? 1) || 1;
  const fx = Number(posX ?? (profile as any)?.avatar_pos_x ?? 50);
  const fy = Number(posY ?? (profile as any)?.avatar_pos_y ?? 50);

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
  }, [stored]);

  const clickable = interactive || !!onClick;

  return (
    <Avatar
      className={cn(
        className,
        clickable &&
          "cursor-pointer transition-all hover:ring-2 hover:ring-primary/60 hover:scale-[1.02]"
      )}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={ariaLabel ?? (clickable ? `View ${displayName}'s profile` : undefined)}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {resolved && type === "video" ? (
        <video
          src={resolved}
          className="aspect-square h-full w-full"
          style={{
            objectFit: "cover",
            objectPosition: `${fx}% ${fy}%`,
            transform: `scale(${fZoom})`,
            transformOrigin: "center",
          }}
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          preload="metadata"
          aria-hidden="true"
        />
      ) : (
        <AvatarImage src={resolved || undefined} alt={displayName || "User"} />
      )}
      <AvatarFallback className="bg-primary/10 text-primary">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
