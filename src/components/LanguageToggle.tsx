import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export default function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLanguage();

  return (
    <Button
      variant="ghost"
      size={compact ? "icon" : "sm"}
      className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      onClick={() => setLang(lang === "pt" ? "en" : "pt")}
    >
      <Globe className="h-3.5 w-3.5 shrink-0" />
      {!compact && (lang === "pt" ? "EN" : "PT")}
    </Button>
  );
}
