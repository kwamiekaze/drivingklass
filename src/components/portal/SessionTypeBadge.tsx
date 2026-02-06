import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { SteeringWheel } from "@/components/icons/SteeringWheel";
import { cn } from "@/lib/utils";

interface SessionTypeBadgeProps {
  sessionType?: string;
  className?: string;
  size?: "sm" | "md";
}

export function SessionTypeBadge({ sessionType, className, size = "sm" }: SessionTypeBadgeProps) {
  const type = sessionType || "driving";
  const isTest = type === "testing";

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <Badge
      className={cn(
        "gap-1 font-medium border-0",
        isTest
          ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
          : "bg-primary/20 text-primary",
        className
      )}
    >
      {isTest ? (
        <CheckCircle className={iconSize} />
      ) : (
        <SteeringWheel className={iconSize} />
      )}
      {isTest ? "Road Test" : "Driving"}
    </Badge>
  );
}
