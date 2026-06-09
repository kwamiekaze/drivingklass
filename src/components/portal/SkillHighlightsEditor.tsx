import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, RotateCcw, Star, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { RATING_CATEGORIES } from "@/types/portal";
import { SKILL_LABELS, SKILL_KEYS } from "@/lib/reportCardGraphData";

export interface SkillHighlightItem {
  skill_key: string;
  skill_label: string;
  source_type: "auto" | "manual";
}

interface Props {
  strongest: SkillHighlightItem[];
  mostImproved: SkillHighlightItem[];
  focusAreas: SkillHighlightItem[];
  onChange: (field: "strongest" | "mostImproved" | "focusAreas", items: SkillHighlightItem[]) => void;
  /** Current form ratings to compute auto-suggestions */
  currentRatings: Record<string, number>;
  /** Historical reports for computing most improved */
  priorReports?: Array<Record<string, number | string | null | undefined>>;
  /** True when this is the student's first lesson (no prior completed reports) */
  isFirstLesson?: boolean;
}

const MAX_ITEMS = 5;

const SKILL_OPTIONS = RATING_CATEGORIES
  .filter(c => c.key !== "overall")
  .map(c => ({ key: c.key, label: c.label }));

function computeAutoSuggestions(
  currentRatings: Record<string, number>,
  priorReports?: Array<Record<string, number | string | null | undefined>>
): { strongest: SkillHighlightItem[]; mostImproved: SkillHighlightItem[]; focusAreas: SkillHighlightItem[] } {
  const skillScores = SKILL_KEYS.map(key => ({
    key,
    label: SKILL_LABELS[key] || key,
    score: currentRatings[key] || 0,
  }));

  // Strongest: top 2 by score
  const sorted = [...skillScores].sort((a, b) => b.score - a.score);
  const strongest: SkillHighlightItem[] = sorted.slice(0, 2).filter(s => s.score > 0).map(s => ({
    skill_key: s.key,
    skill_label: s.label,
    source_type: "auto" as const,
  }));

  // Focus Areas: bottom 2 by score (with score > 0)
  const weakest = [...skillScores].filter(s => s.score > 0).sort((a, b) => a.score - b.score);
  const focusAreas: SkillHighlightItem[] = weakest.slice(0, 2).map(s => ({
    skill_key: s.key,
    skill_label: s.label,
    source_type: "auto" as const,
  }));

  // Most Improved: biggest gain from first prior report to current
  let mostImproved: SkillHighlightItem[] = [];
  if (priorReports && priorReports.length > 0) {
    const first = priorReports[0];
    const gains = SKILL_KEYS.map(key => {
      const firstVal = typeof first[key] === "number" ? (first[key] as number) : 0;
      const currentVal = currentRatings[key] || 0;
      return { key, label: SKILL_LABELS[key] || key, gain: currentVal - firstVal };
    }).filter(g => g.gain > 0).sort((a, b) => b.gain - a.gain);

    mostImproved = gains.slice(0, 2).map(g => ({
      skill_key: g.key,
      skill_label: g.label,
      source_type: "auto" as const,
    }));
  }

  // Fallback if no improved skills
  if (mostImproved.length === 0 && strongest.length > 0) {
    mostImproved = [strongest[0]];
  }

  return { strongest, mostImproved, focusAreas };
}

export function SkillHighlightsEditor({ strongest, mostImproved, focusAreas, onChange, currentRatings, priorReports, isFirstLesson }: Props) {
  const [initialized, setInitialized] = useState(false);
  // Default: exclude Most Improved on first lesson (nothing to compare against yet)
  const [excludeMostImproved, setExcludeMostImproved] = useState<boolean>(!!isFirstLesson);

  // Auto-populate defaults on first render if all groups are empty
  useEffect(() => {
    if (initialized) return;
    if (strongest.length === 0 && mostImproved.length === 0 && focusAreas.length === 0) {
      const suggestions = computeAutoSuggestions(currentRatings, priorReports);
      if (suggestions.strongest.length > 0 || suggestions.focusAreas.length > 0) {
        onChange("strongest", suggestions.strongest);
        if (!isFirstLesson) onChange("mostImproved", suggestions.mostImproved);
        onChange("focusAreas", suggestions.focusAreas);
      }
    }
    setInitialized(true);
  }, [initialized, strongest, mostImproved, focusAreas, currentRatings, priorReports, onChange, isFirstLesson]);

  // When user toggles exclusion on, clear out any items so they don't get saved
  useEffect(() => {
    if (excludeMostImproved && mostImproved.length > 0) {
      onChange("mostImproved", []);
    }
  }, [excludeMostImproved, mostImproved.length, onChange]);

  const handleReset = useCallback((field: "strongest" | "mostImproved" | "focusAreas") => {
    const suggestions = computeAutoSuggestions(currentRatings, priorReports);
    onChange(field, suggestions[field]);
  }, [currentRatings, priorReports, onChange]);

  const handleAdd = (field: "strongest" | "mostImproved" | "focusAreas", items: SkillHighlightItem[], skillKey: string) => {
    if (items.length >= MAX_ITEMS) return;
    if (items.some(i => i.skill_key === skillKey)) return;
    const label = SKILL_LABELS[skillKey] || skillKey;
    onChange(field, [...items, { skill_key: skillKey, skill_label: label, source_type: "manual" }]);
  };

  const handleRemove = (field: "strongest" | "mostImproved" | "focusAreas", items: SkillHighlightItem[], skillKey: string) => {
    onChange(field, items.filter(i => i.skill_key !== skillKey));
  };

  const renderGroup = (
    field: "strongest" | "mostImproved" | "focusAreas",
    label: string,
    icon: React.ReactNode,
    items: SkillHighlightItem[],
    colorClass: string,
  ) => {
    const usedKeys = items.map(i => i.skill_key);
    const available = SKILL_OPTIONS.filter(o => !usedKeys.includes(o.key));

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {items.length}/{MAX_ITEMS}
            </Badge>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => handleReset(field)}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>

        <div className="space-y-1.5">
          {items.map((item) => (
            <div
              key={item.skill_key}
              className={`flex items-center justify-between rounded-md border border-border/60 bg-card/60 px-3 py-1.5 ${colorClass}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{item.skill_label}</span>
                {item.source_type === "auto" && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground border-muted-foreground/30">
                    auto
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(field, items, item.skill_key)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {items.length < MAX_ITEMS && available.length > 0 && (
          <Select onValueChange={(val) => handleAdd(field, items, val)}>
            <SelectTrigger className="h-9 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Plus className="h-3.5 w-3.5" />
                <span>Add {label.toLowerCase()}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {available.map((opt) => (
                <SelectItem key={opt.key} value={opt.key}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  };

  return (
    <Card className="luxury-card">
      <CardHeader>
        <CardTitle className="text-base">Skill Progress Highlights</CardTitle>
        <p className="text-xs text-muted-foreground">Auto-suggested from ratings. Override as needed.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {renderGroup(
          "strongest",
          "Strongest",
          <Star className="h-4 w-4 text-green-600 dark:text-green-500" />,
          strongest,
          "border-l-2 border-l-green-500/40",
        )}
        <div className="space-y-2">
          <label className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 cursor-pointer">
            <Checkbox
              checked={excludeMostImproved}
              onCheckedChange={(v) => setExcludeMostImproved(!!v)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                Exclude "Most Improved" from this report
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isFirstLesson
                  ? "Recommended for a student's first lesson — there's no prior report to compare against. Rate after Lesson #2."
                  : "Hide the Most Improved section on this report card."}
              </p>
            </div>
          </label>
          {!excludeMostImproved && renderGroup(
            "mostImproved",
            "Most Improved",
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
            mostImproved,
            "border-l-2 border-l-blue-500/40",
          )}
        </div>
        {renderGroup(
          "focusAreas",
          "Focus Areas",
          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
          focusAreas,
          "border-l-2 border-l-orange-500/40",
        )}
      </CardContent>
    </Card>
  );
}
