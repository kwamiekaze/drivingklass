import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface HoursRemainingCardProps {
  hoursRemaining: number;
  purchasedHours?: number;
  completedHours?: number;
  className?: string;
}

export function HoursRemainingCard({ hoursRemaining, purchasedHours, completedHours, className }: HoursRemainingCardProps) {
  const formattedHours = Number(hoursRemaining || 0).toFixed(1);
  const formattedPurchased = purchasedHours !== undefined ? Number(purchasedHours || 0).toFixed(1) : null;
  const formattedCompleted = completedHours !== undefined ? Number(completedHours || 0).toFixed(1) : null;
  
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
        {formattedPurchased && (
          <p className="mt-1 text-sm text-muted-foreground">
            of {formattedPurchased}h purchased
          </p>
        )}
        {formattedCompleted && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formattedCompleted}h completed
          </p>
        )}
        <CardDescription className="mt-2 text-sm">
          Automatically updates after each completed session
        </CardDescription>
      </CardContent>
    </Card>
  );
}
