import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface HoursRemainingCardProps {
  hoursRemaining: number;
  className?: string;
}

export function HoursRemainingCard({ hoursRemaining, className }: HoursRemainingCardProps) {
  const formattedHours = hoursRemaining.toFixed(1);
  
  return (
    <Card className={cn(
      "portal-card relative overflow-hidden",
      className
    )}>
      {/* Glowing border animation */}
      <div className="absolute inset-0 rounded-xl">
        <div className="absolute inset-0 rounded-xl animate-glow-pulse" />
      </div>
      
      <CardHeader className="pb-2 relative">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          Hours Remaining
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-primary tabular-nums">
            {formattedHours}
          </span>
          <span className="text-lg text-muted-foreground">hours</span>
        </div>
        <CardDescription className="mt-2 text-sm">
          Automatically updates after each completed lesson
        </CardDescription>
      </CardContent>
    </Card>
  );
}
