import { cn } from "@/lib/utils";

interface GoldSportcarProps {
  className?: string;
}

export function GoldSportcar({ className }: GoldSportcarProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-gold", className)}
    >
      {/* Sports car silhouette */}
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(38 85% 38%)" />
          <stop offset="50%" stopColor="hsl(43 80% 52%)" />
          <stop offset="100%" stopColor="hsl(48 90% 78%)" />
        </linearGradient>
      </defs>
      {/* Car body */}
      <path
        d="M3 14.5L4 12L6.5 11L8 9.5L11 8.5H16L18.5 10L20.5 11L22 13V15H20.5C20.5 16.1046 19.6046 17 18.5 17C17.3954 17 16.5 16.1046 16.5 15H8.5C8.5 16.1046 7.60457 17 6.5 17C5.39543 17 4.5 16.1046 4.5 15H2V14L3 14.5Z"
        fill="url(#goldGradient)"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Windows */}
      <path
        d="M9 11.5L10 9.5H14.5L16.5 11.5H9Z"
        fill="hsl(30 10% 3% / 0.6)"
        stroke="currentColor"
        strokeWidth="0.5"
      />
      {/* Front wheel */}
      <circle cx="6.5" cy="15" r="2" fill="hsl(0 0% 20%)" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="6.5" cy="15" r="0.75" fill="url(#goldGradient)" />
      {/* Rear wheel */}
      <circle cx="18.5" cy="15" r="2" fill="hsl(0 0% 20%)" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="18.5" cy="15" r="0.75" fill="url(#goldGradient)" />
      {/* Headlight */}
      <ellipse cx="21" cy="12.5" rx="0.5" ry="0.75" fill="hsl(48 100% 90%)" />
      {/* Taillight */}
      <rect x="2.5" y="12" width="0.75" height="1.5" rx="0.25" fill="hsl(0 80% 50%)" />
    </svg>
  );
}
