import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGUAGES } from "@/i18n";

/**
 * Standalone icon-only language switcher button.
 * Suitable for headers (e.g. public report card).
 */
export function LanguageSwitcherButton({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || "en").slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={className} aria-label={t("common.language")}>
          <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border z-50">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSwitcherButton;
