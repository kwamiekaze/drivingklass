import { Star, TrendingUp, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSkillLabel } from "@/i18n/skills";

interface SkillHighlightItem {
  skill_key: string;
  skill_label: string;
  source_type?: string;
}

interface Props {
  strongest?: SkillHighlightItem[];
  mostImproved?: SkillHighlightItem[];
  focusAreas?: SkillHighlightItem[];
  className?: string;
}

export function SkillHighlightsDisplay({ strongest, mostImproved, focusAreas, className }: Props) {
  const { t } = useTranslation();
  const skillLabel = useSkillLabel();
  const hasData = (strongest && strongest.length > 0) ||
    (mostImproved && mostImproved.length > 0) ||
    (focusAreas && focusAreas.length > 0);

  if (!hasData) return null;

  const renderGroup = (
    label: string,
    icon: React.ReactNode,
    items: SkillHighlightItem[] | undefined,
    colorClass: string,
    bgClass: string,
  ) => {
    if (!items || items.length === 0) return null;
    return (
      <div className={`rounded-lg border border-border bg-card/80 backdrop-blur p-3 space-y-2 ${bgClass}`}>
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
        </div>
        <div className="space-y-1">
          {items.map((item) => (
            <p key={item.skill_key} className={`text-xs font-semibold ${colorClass}`}>
              {skillLabel(item.skill_key, item.skill_label)}
            </p>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 ${className || ""}`}>
      {renderGroup(
        t("report.strongest"),
        <Star className="h-4 w-4 text-green-600 dark:text-green-500" />,
        strongest,
        "text-green-700 dark:text-green-400",
        "border-l-2 border-l-green-500/50",
      )}
      {renderGroup(
        t("report.mostImproved"),
        <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
        mostImproved,
        "text-blue-700 dark:text-blue-400",
        "border-l-2 border-l-blue-500/50",
      )}
      {renderGroup(
        t("report.focusAreas"),
        <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
        focusAreas,
        "text-orange-700 dark:text-orange-400",
        "border-l-2 border-l-orange-500/50",
      )}
    </div>
  );
}
