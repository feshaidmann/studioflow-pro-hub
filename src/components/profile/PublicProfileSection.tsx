import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Globe, Copy, ExternalLink, Check } from "lucide-react";

export default function PublicProfileSection() {
  const { profile, refreshProfile } = useProfile() as any;
  const [enabled, setEnabled] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showWhats, setShowWhats] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setEnabled(!!profile.public_profile_enabled);
    setShowEmail(!!profile.show_public_email);
    setShowWhats(!!profile.show_public_whatsapp);
  }, [profile?.id]);

  const username: string | null = profile?.username ?? null;
  const publicUrl = username ? `${window.location.origin}/u/${username}` : "";

  const save = async (patch: Record<string, boolean>) => {
    if (!profile?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success("Preferências atualizadas.");
    refreshProfile?.();
  };

  const handleToggleMain = async (v: boolean) => {
    setEnabled(v);
    await save({ public_profile_enabled: v });
  };
  const handleToggleEmail = async (v: boolean) => {
    setShowEmail(v);
    await save({ show_public_email: v });
  };
  const handleToggleWhats = async (v: boolean) => {
    setShowWhats(v);
    await save({ show_public_whatsapp: v });
  };

  const copy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Perfil público
        </CardTitle>
        <CardDescription>
          Permita que qualquer pessoa (mesmo sem conta) veja seu perfil em <code>/u/{username || "seu-username"}</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="pp-main" className="text-sm font-medium">
              Tornar visível na web aberta
            </Label>
            <p className="text-xs text-muted-foreground">
              Nome, bio, especialidades, projetos e avaliações ficam públicos. Email/WhatsApp só aparecem se você liberar abaixo.
            </p>
          </div>
          <Switch id="pp-main" checked={enabled} onCheckedChange={handleToggleMain} disabled={saving || !username} />
        </div>

        <div className={`space-y-3 pl-3 border-l-2 ${enabled ? "border-primary/40" : "border-border opacity-50 pointer-events-none"}`}>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="pp-email" className="text-sm">
              Mostrar e-mail público
            </Label>
            <Switch id="pp-email" checked={showEmail} onCheckedChange={handleToggleEmail} disabled={saving || !enabled} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="pp-wa" className="text-sm">
              Mostrar WhatsApp
            </Label>
            <Switch id="pp-wa" checked={showWhats} onCheckedChange={handleToggleWhats} disabled={saving || !enabled} />
          </div>
        </div>

        {username && (
          <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-center gap-2">
            <code className="text-xs flex-1 truncate text-muted-foreground">{publicUrl}</code>
            <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={copy}>
              {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            {enabled && (
              <Button size="sm" variant="ghost" className="h-7 gap-1" asChild>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </div>
        )}

        {!username && (
          <p className="text-xs text-muted-foreground">
            Defina um nome de usuário em <strong>Meu perfil</strong> para ativar o link público.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
