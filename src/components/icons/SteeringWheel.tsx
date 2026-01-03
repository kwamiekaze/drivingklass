import { forwardRef, SVGProps } from "react";

interface SteeringWheelProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const SteeringWheel = forwardRef<SVGSVGElement, SteeringWheelProps>(
  ({ size = 24, className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Outer wheel */}
      <circle cx="12" cy="12" r="9" />
      {/* Center hub */}
      <circle cx="12" cy="12" r="2" />
      {/* Top spoke */}
      <line x1="12" y1="3" x2="12" y2="10" />
      {/* Bottom left spoke */}
      <line x1="12" y1="14" x2="5.5" y2="18.5" />
      {/* Bottom right spoke */}
      <line x1="12" y1="14" x2="18.5" y2="18.5" />
    </svg>
  )
);

SteeringWheel.displayName = "SteeringWheel";
