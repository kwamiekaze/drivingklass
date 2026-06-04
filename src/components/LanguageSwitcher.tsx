import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGUAGES } from "@/i18n";

/**
 * Embeds language selection inside an existing DropdownMenuContent.
 * Renders a label + radio items (English / Spanish).
 */
export function LanguageSwitcherInline() {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || "en").slice(0, 2);

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Globe className="h-3.5 w-3.5" />
        {t("common.language")}
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={SUPPORTED_LANGUAGES.includes(current as any) ? current : "en"}
        onValueChange={(val) => {
          i18n.changeLanguage(val);
          try {
            localStorage.setItem("dk_lang", val);
          } catch {}
        }}
      >
        <DropdownMenuRadioItem value="en">{t("common.english")}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="es">{t("common.spanish")}</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </>
  );
}

export default LanguageSwitcherInline;
