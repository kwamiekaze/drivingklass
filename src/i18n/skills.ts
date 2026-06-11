import { useTranslation } from "react-i18next";
import { RATING_CATEGORIES } from "@/types/portal";

/**
 * Returns a function that translates a skill key (e.g. 'acceleration') to a
 * label in the active language. Falls back to the original English label.
 */
export function useSkillLabel() {
  const { t } = useTranslation();
  return (key: string, fallback?: string) => {
    const translated = t(`skills.${key}`, { defaultValue: "" });
    if (translated) return translated;
    return fallback ?? (RATING_CATEGORIES.find((c) => c.key === key)?.label || key);
  };
}
