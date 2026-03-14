import { ProgressInsights } from "@/lib/reportCardGraphData";
import { Star, TrendingUp, Target, AlertTriangle, BarChart3 } from "lucide-react";

interface Props {
  insights: ProgressInsights;
  className?: string;
}

export function StudentProgressSummaryCards({ insights, className }: Props) {
  if (insights.totalReports === 0) return null;

  const cards = [
    {
      icon: BarChart3,
      label: "Total Reports",
      value: insights.totalReports.toString(),
      color: "text-primary",
    },
    {
      icon: Star,
      label: "Overall Avg",
      value: insights.overallAverage.toFixed(1),
      color: "text-primary",
    },
    {
      icon: TrendingUp,
      label: "Strongest",
      value: insights.strongestSkill,
      color: "text-green-600 dark:text-green-500",
    },
    {
      icon: Target,
      label: "Most Improved",
      value: insights.mostImproved,
      sub: insights.mostImprovedGain > 0 ? `+${insights.mostImprovedGain.toFixed(1)}` : undefined,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      icon: AlertTriangle,
      label: "Focus Area",
      value: insights.focusArea,
      color: "text-orange-600 dark:text-orange-400",
    },
  ];

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-5 gap-2 ${className || ''}`}>
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-border bg-card/80 backdrop-blur p-3 text-center space-y-1"
        >
          <card.icon className={`h-4 w-4 mx-auto ${card.color}`} />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{card.label}</p>
          <p className="text-xs font-semibold text-foreground truncate">{card.value}</p>
          {card.sub && (
            <p className="text-[10px] text-green-600 dark:text-green-400 font-medium">{card.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
