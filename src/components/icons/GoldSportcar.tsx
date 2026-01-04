import { cn } from "@/lib/utils";

interface GoldSportcarProps {
  className?: string;
}

export function GoldSportcar({ className }: GoldSportcarProps) {
  return (
    <svg
      viewBox="0 0 100 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-gold", className)}
    >
      <defs>
        {/* Main gold gradient */}
        <linearGradient id="goldBodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(38 85% 32%)" />
          <stop offset="30%" stopColor="hsl(43 80% 48%)" />
          <stop offset="60%" stopColor="hsl(45 85% 58%)" />
          <stop offset="100%" stopColor="hsl(48 90% 72%)" />
        </linearGradient>
        {/* Highlight gradient for roof */}
        <linearGradient id="goldHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(48 90% 75%)" />
          <stop offset="100%" stopColor="hsl(43 80% 50%)" />
        </linearGradient>
        {/* Shadow gradient */}
        <linearGradient id="goldShadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(38 70% 35%)" />
          <stop offset="100%" stopColor="hsl(35 60% 25%)" />
        </linearGradient>
        {/* Window gradient */}
        <linearGradient id="windowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(220 20% 20%)" />
          <stop offset="100%" stopColor="hsl(220 15% 8%)" />
        </linearGradient>
        {/* Wheel gradient */}
        <radialGradient id="wheelGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(0 0% 30%)" />
          <stop offset="70%" stopColor="hsl(0 0% 15%)" />
          <stop offset="100%" stopColor="hsl(0 0% 8%)" />
        </radialGradient>
        {/* Rim gradient */}
        <radialGradient id="rimGradient" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="hsl(48 70% 70%)" />
          <stop offset="100%" stopColor="hsl(38 60% 40%)" />
        </radialGradient>
      </defs>
      
      {/* Car body - sleek sports car shape */}
      <path
        d="M8 28 
           L12 28 
           L14 24 
           L18 22 
           L28 18 
           L38 14 
           L48 12 
           L62 12 
           L72 14 
           L80 18 
           L88 22 
           L92 26 
           L92 30 
           L8 30 
           Z"
        fill="url(#goldBodyGradient)"
      />
      
      {/* Lower body detail */}
      <path
        d="M10 30 L10 28 L14 26 L86 26 L90 28 L90 30 Z"
        fill="url(#goldShadow)"
      />
      
      {/* Roof line highlight */}
      <path
        d="M38 14 L48 12 L62 12 L72 14 L68 14 L62 13 L48 13 L42 14 Z"
        fill="url(#goldHighlight)"
      />
      
      {/* Front windshield */}
      <path
        d="M40 15 L48 13 L62 13 L58 15 Z"
        fill="url(#windowGradient)"
        stroke="hsl(38 70% 45%)"
        strokeWidth="0.5"
      />
      
      {/* Rear windshield */}
      <path
        d="M62 13 L72 15 L68 17 L62 15 Z"
        fill="url(#windowGradient)"
        stroke="hsl(38 70% 45%)"
        strokeWidth="0.5"
      />
      
      {/* Side window */}
      <path
        d="M42 16 L58 16 L58 20 L42 20 Z"
        fill="url(#windowGradient)"
        stroke="hsl(38 70% 45%)"
        strokeWidth="0.5"
        rx="1"
      />
      
      {/* Door line */}
      <line x1="50" y1="16" x2="50" y2="24" stroke="hsl(38 60% 35%)" strokeWidth="0.5" />
      
      {/* Hood line */}
      <path
        d="M28 18 L38 14"
        stroke="hsl(45 80% 60%)"
        strokeWidth="0.5"
        fill="none"
      />
      
      {/* Front wheel well */}
      <ellipse cx="24" cy="30" rx="10" ry="6" fill="hsl(0 0% 5%)" />
      
      {/* Front wheel */}
      <circle cx="24" cy="30" r="7" fill="url(#wheelGradient)" />
      <circle cx="24" cy="30" r="5" fill="hsl(0 0% 12%)" />
      <circle cx="24" cy="30" r="3.5" fill="url(#rimGradient)" />
      <circle cx="24" cy="30" r="1.5" fill="hsl(0 0% 25%)" />
      {/* Wheel spokes */}
      <g stroke="hsl(38 50% 55%)" strokeWidth="0.6">
        <line x1="24" y1="26.5" x2="24" y2="28" />
        <line x1="24" y1="32" x2="24" y2="33.5" />
        <line x1="20.5" y1="30" x2="22" y2="30" />
        <line x1="26" y1="30" x2="27.5" y2="30" />
        <line x1="21.5" y1="27.5" x2="22.5" y2="28.5" />
        <line x1="25.5" y1="31.5" x2="26.5" y2="32.5" />
        <line x1="21.5" y1="32.5" x2="22.5" y2="31.5" />
        <line x1="25.5" y1="28.5" x2="26.5" y2="27.5" />
      </g>
      
      {/* Rear wheel well */}
      <ellipse cx="76" cy="30" rx="10" ry="6" fill="hsl(0 0% 5%)" />
      
      {/* Rear wheel */}
      <circle cx="76" cy="30" r="7" fill="url(#wheelGradient)" />
      <circle cx="76" cy="30" r="5" fill="hsl(0 0% 12%)" />
      <circle cx="76" cy="30" r="3.5" fill="url(#rimGradient)" />
      <circle cx="76" cy="30" r="1.5" fill="hsl(0 0% 25%)" />
      {/* Wheel spokes */}
      <g stroke="hsl(38 50% 55%)" strokeWidth="0.6">
        <line x1="76" y1="26.5" x2="76" y2="28" />
        <line x1="76" y1="32" x2="76" y2="33.5" />
        <line x1="72.5" y1="30" x2="74" y2="30" />
        <line x1="78" y1="30" x2="79.5" y2="30" />
        <line x1="73.5" y1="27.5" x2="74.5" y2="28.5" />
        <line x1="77.5" y1="31.5" x2="78.5" y2="32.5" />
        <line x1="73.5" y1="32.5" x2="74.5" y2="31.5" />
        <line x1="77.5" y1="28.5" x2="78.5" y2="27.5" />
      </g>
      
      {/* Headlight */}
      <ellipse cx="90" cy="24" rx="2" ry="2.5" fill="hsl(48 100% 90%)" />
      <ellipse cx="90" cy="24" rx="1" ry="1.5" fill="hsl(48 100% 98%)" />
      
      {/* Taillight */}
      <rect x="8" y="24" width="3" height="4" rx="1" fill="hsl(0 80% 45%)" />
      <rect x="9" y="25" width="1.5" height="2" rx="0.5" fill="hsl(0 90% 60%)" />
      
      {/* Side mirror */}
      <ellipse cx="38" cy="17" rx="2" ry="1.5" fill="url(#goldBodyGradient)" />
      
      {/* Body accent line */}
      <path
        d="M14 24 L86 24"
        stroke="hsl(45 80% 65%)"
        strokeWidth="0.5"
        fill="none"
      />
      
      {/* Front grille detail */}
      <path
        d="M88 23 L90 22 L92 24 L90 26 L88 25 Z"
        fill="hsl(0 0% 15%)"
        stroke="hsl(38 60% 50%)"
        strokeWidth="0.3"
      />
    </svg>
  );
}
