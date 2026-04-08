import { useState, useEffect, useRef } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { UserCircle, Plus, X, Eye, Music, MapPin, Mail, Phone, Users, Briefcase, CalendarDays, Globe, Trash2, Loader2, Save, Link2, Check, ExternalLink, Camera, Youtube, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const SPECIALTY_OPTIONS = [
  "Guitarrista", "Baixista", "Baterista", "Tecladista", "Violinista",
  "Violonista", "Cantor(a)", "Produtor", "Mix Engineer", "Mastering Engineer",
  "Compositor", "Arranjador", "Trompetista", "Saxofonista", "Percussionista",
  "Marketing Musical", "Social Media", "Designer Gráfico", "Assessor de Imprensa",
  "Videomaker", "Fotógrafo", "Diretor Criativo",
];

const YOUTUBE_REGEX = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)(\/.*)?$/i;

function isValidYoutubeUrl(url: string): boolean {
  if (!url.trim()) return true; // empty is allowed
  return YOUTUBE_REGEX.test(url.trim());
}

export default function FreelancerProfile() {
  const { user } = useAuth();
  const { profile, updateProfile, isPro, plan, refreshProfile } = useProfile();

  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [projectStats, setProjectStats] = useState({ total: 0, uniqueArtists: 0 });
  const [newSpecialty, setNewSpecialty] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local form state
  const [form, setForm] = useState({
    display_name: "",
    city: "",
    whatsapp: "",
    public_email: "",
    specialties: [] as string[],
    bio: "",
    accept_invites: true,
    allow_global_listing: false,
    avatar_url: "",
    youtube_url: "",
  });

  const [youtubeError, setYoutubeError] = useState("");

  // Sync from profile
  useEffect(() => {
    if (!profile) return;
    const p = profile as any;
    setForm({
      display_name: p.display_name ?? "",
      city: p.city ?? "",
      whatsapp: p.whatsapp ?? "",
      public_email: p.public_email ?? "",
      specialties: p.specialties ?? [],
      bio: p.bio ?? "",
      accept_invites: p.accept_invites ?? true,
      allow_global_listing: p.allow_global_listing ?? false,
      avatar_url: p.avatar_url ?? "",
      youtube_url: p.youtube_url ?? "",
    });
    if (p.avatar_url) setAvatarPreview(p.avatar_url);
  }, [profile?.id]);

  // Fetch project stats
  useEffect(() => {
    if (!user) return;
    supabase
      .from("project_members")
      .select("project_id, notes")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!data) return;
        const total = (data as any[]).length;
        const uniqueProjects = new Set((data as any[]).map((r: any) => r.project_id)).size;
        setProjectStats({ total, uniqueArtists: uniqueProjects });
      });
  }, [user]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return;
    }
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Append cache-busting timestamp
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setAvatarPreview(publicUrl);
      setForm((prev) => ({ ...prev, avatar_url: urlData.publicUrl }));
      toast.success("Foto carregada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao enviar foto: " + (err?.message ?? "Tente novamente"));
    } finally {
      setAvatarUploading(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleYoutubeChange = (val: string) => {
    setForm((prev) => ({ ...prev, youtube_url: val }));
    if (val.trim() && !isValidYoutubeUrl(val)) {
      setYoutubeError("Apenas links do YouTube são permitidos (youtube.com ou youtu.be)");
    } else {
      setYoutubeError("");
    }
  };

  const primarySpecialty = form.specialties[0] ?? "";

  const handleAddSpecialty = (s: string) => {
    const val = s.trim();
    if (!val || form.specialties.includes(val) || form.specialties.length >= 5) return;
    setForm((prev) => ({ ...prev, specialties: [...prev.specialties, val] }));
    setNewSpecialty("");
  };

  const handleRemoveSpecialty = (idx: number) => {
    setForm((prev) => ({ ...prev, specialties: prev.specialties.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (youtubeError) {
      toast.error("Corrija o link do YouTube antes de salvar");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        display_name: form.display_name,
        city: form.city,
        whatsapp: form.whatsapp,
        public_email: form.public_email,
        specialties: form.specialties,
        accept_invites: form.accept_invites,
        allow_global_listing: form.allow_global_listing,
        bio: form.bio,
        avatar_url: form.avatar_url,
        youtube_url: form.youtube_url.trim(),
      } as any);
      toast.success("Perfil atualizado ✅");
    } catch {
      toast.error("Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const publicUsername = (profile as any)?.username ?? "";
  const publicProfileUrl = publicUsername
    ? `${window.location.origin}/u/${publicUsername}`
    : null;

  const handleCopyLink = () => {
    if (!publicProfileUrl) return;
    navigator.clipboard.writeText(publicProfileUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleRemoveFromBank = async () => {
    setRemoveConfirmOpen(false);
    await updateProfile({ allow_global_listing: false });
    setForm((prev) => ({ ...prev, allow_global_listing: false }));
    toast.success("Você foi removido do banco de profissionais");
  };

  const memberSince = profile?.created_at
    ? format(new Date(profile.created_at), "MMMM 'de' yyyy", { locale: ptBR })
    : "—";

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold neon-text">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground mt-1">Como você aparece para artistas e produtores</p>
        </div>
        <Badge variant={isPro ? "default" : "secondary"} className="uppercase text-xs font-semibold tracking-wide">
          {isPro ? "Pro" : "Free"}
        </Badge>
      </div>

      {/* Avatar + Stats */}
      <Card className="border-border bg-card/50">
        <CardContent className="pt-5">
          <div className="flex items-center gap-5 mb-5">
            {/* Avatar upload */}
            <div className="relative shrink-0">
              <button
                onClick={handleAvatarClick}
                disabled={avatarUploading}
                className="group relative h-20 w-20 rounded-full overflow-hidden border-2 border-border hover:border-primary/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Alterar foto de perfil"
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                    <UserCircle className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {avatarUploading
                    ? <Loader2 className="h-5 w-5 animate-spin text-foreground" />
                    : <Camera className="h-5 w-5 text-foreground" />
                  }
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{form.display_name || user?.email?.split("@")[0]}</p>
              {form.specialties[0] && <p className="text-xs text-primary mt-0.5">{form.specialties[0]}</p>}
              {form.city && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{form.city}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                Clique na foto para alterar · JPG, PNG, WebP · máx. 2 MB
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{profile?.projects_completed ?? projectStats.total}</div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><Briefcase className="h-3 w-3" /> Projetos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{projectStats.uniqueArtists}</div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Artistas</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">{memberSince}</div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><CalendarDays className="h-3 w-3" /> Na plataforma</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visibility toggles */}
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Visibilidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Visível no banco de profissionais</p>
              <p className="text-xs text-muted-foreground">Artistas podem te encontrar e convidar para projetos</p>
            </div>
            <Switch
              checked={form.allow_global_listing}
              onCheckedChange={(v) => setForm((prev) => ({ ...prev, allow_global_listing: v }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Aceitar convites de projetos</p>
              <p className="text-xs text-muted-foreground">Receba convites de participação em projetos</p>
            </div>
            <Switch
              checked={form.accept_invites}
              onCheckedChange={(v) => setForm((prev) => ({ ...prev, accept_invites: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Editable info */}
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><UserCircle className="h-4 w-4 text-primary" /> Informações Públicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Nome artístico / profissional</Label>
              <Input
                id="display-name"
                value={form.display_name}
                onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))}
                placeholder="Como você quer ser chamado"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city"><MapPin className="inline h-3 w-3 mr-1" />Cidade/Estado</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="ex: São Paulo, SP"
              />
            </div>
          </div>

          {/* Specialties */}
          <div className="space-y-2">
            <Label><Music className="inline h-3 w-3 mr-1" />Especialidades (até 5)</Label>
            <div className="flex flex-wrap gap-2">
              {form.specialties.map((s, i) => (
                <Badge key={s} variant={i === 0 ? "default" : "secondary"} className="gap-1 pr-1">
                  {i === 0 && <span className="text-[10px] opacity-70">principal</span>}
                  {s}
                  <button onClick={() => handleRemoveSpecialty(i)} className="ml-1 hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {form.specialties.length < 5 && (
              <div className="flex gap-2">
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value=""
                  onChange={(e) => { if (e.target.value) handleAddSpecialty(e.target.value); }}
                >
                  <option value="">Selecionar especialidade...</option>
                  {SPECIALTY_OPTIONS.filter((o) => !form.specialties.includes(o)).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <div className="flex gap-1">
                  <Input
                    placeholder="Outra..."
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSpecialty(newSpecialty); } }}
                    className="w-32"
                  />
                  <Button size="icon" variant="ghost" onClick={() => handleAddSpecialty(newSpecialty)} disabled={!newSpecialty.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio <span className="text-muted-foreground font-normal">(aparece no perfil público)</span></Label>
            <Textarea
              id="bio"
              value={form.bio}
              onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value.slice(0, 280) }))}
              placeholder="Conte um pouco sobre você, seu estilo e experiência..."
              className="resize-none"
              rows={3}
            />
            <p className="text-[11px] text-muted-foreground text-right">{form.bio.length}/280</p>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="public-email"><Mail className="inline h-3 w-3 mr-1" />E-mail público</Label>
              <Input
                id="public-email"
                type="email"
                value={form.public_email}
                onChange={(e) => setForm((prev) => ({ ...prev, public_email: e.target.value }))}
                placeholder="contato@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp"><Phone className="inline h-3 w-3 mr-1" />WhatsApp</Label>
              <Input
                id="whatsapp"
                value={form.whatsapp}
                onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="+55 11 99999-9999"
              />
            </div>
          </div>

          {/* YouTube link */}
          <div className="space-y-1.5">
            <Label htmlFor="youtube-url">
              <Youtube className="inline h-3 w-3 mr-1 text-destructive" />
              Canal / Vídeo no YouTube
            </Label>
            <div className="relative">
              <Input
                id="youtube-url"
                value={form.youtube_url}
                onChange={(e) => handleYoutubeChange(e.target.value)}
                placeholder="https://youtube.com/@seucanal"
                className={youtubeError ? "border-destructive pr-9" : ""}
              />
              {youtubeError && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive pointer-events-none" />
              )}
            </div>
            {youtubeError ? (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{youtubeError}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Apenas links de youtube.com ou youtu.be são aceitos
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Public profile link */}
      {publicUsername && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary mb-0.5 flex items-center gap-1"><Link2 className="h-3 w-3" /> Seu perfil público</p>
                <p className="text-sm text-muted-foreground truncate">/u/{publicUsername}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-primary/30 hover:bg-primary/10"
                  onClick={handleCopyLink}
                >
                  {linkCopied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Link2 className="h-3.5 w-3.5" />}
                  {linkCopied ? "Copiado!" : "Copiar link"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  asChild
                >
                  <a href={publicProfileUrl!} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir
                  </a>
                </Button>
              </div>
            </div>
            {!form.allow_global_listing && (
              <p className="text-[11px] text-muted-foreground/70 mt-2">
                ⚠️ Perfil oculto — ative "Visível no banco" para torná-lo acessível
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button className="flex-1 neon-glow active:scale-95 transition-transform gap-2" onClick={handleSave} disabled={saving || !!youtubeError}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Salvando..." : "Salvar perfil"}
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => setPreviewOpen(true)}>
          <Eye className="h-4 w-4" />
          Ver como artista vê
        </Button>
      </div>

      {/* Danger zone */}
      {form.allow_global_listing && (
        <div className="flex items-center justify-between px-1 pt-1">
          <div>
            <p className="text-xs text-muted-foreground/70">Remover do banco de profissionais</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">Você não será mais encontrado por artistas</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors text-xs h-7 px-2"
            onClick={() => setRemoveConfirmOpen(true)}
          >
            <Trash2 className="h-3 w-3" />
            Remover
          </Button>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="glass-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Pré-visualização pública
            </DialogTitle>
            <DialogDescription>Como um artista verá seu perfil no banco de profissionais</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Identity */}
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full overflow-hidden border border-primary/20 shrink-0">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-primary/15 flex items-center justify-center text-2xl">🎵</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-base truncate">{form.display_name || user?.email?.split("@")[0]}</p>
                {form.specialties[0] && <p className="text-xs text-primary font-medium">{form.specialties[0]}</p>}
                {form.city && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{form.city}</p>}
              </div>
            </div>

            {/* Platform metrics */}
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 border border-border p-3">
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{profile?.projects_completed ?? projectStats.total}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Projetos<br/>realizados</p>
              </div>
              <div className="text-center border-x border-border">
                <p className="text-lg font-bold text-primary">{projectStats.uniqueArtists}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Artistas<br/>parceiros</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-foreground leading-tight">{memberSince}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Na plata-<br/>forma</p>
              </div>
            </div>

            {/* Additional specialties */}
            {form.specialties.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {form.specialties.slice(1).map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            )}

            {/* Accept invites flag */}
            <div className="flex items-center gap-2 text-xs">
              {form.accept_invites ? (
                <span className="flex items-center gap-1.5 text-primary font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Disponível para novos projetos
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  Não está aceitando novos projetos no momento
                </span>
              )}
            </div>

            {/* Contact + YouTube */}
            <div className="space-y-1.5">
              {form.public_email && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3 w-3" />{form.public_email}
                </p>
              )}
              {form.whatsapp && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3 w-3" />{form.whatsapp}
                </p>
              )}
              {form.youtube_url && isValidYoutubeUrl(form.youtube_url) && (
              <a
                  href={form.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-destructive flex items-center gap-1.5 hover:underline"
                >
                  <Youtube className="h-3 w-3" />
                  {form.youtube_url.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              )}
            </div>

            {!form.allow_global_listing && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                ⚠️ Perfil não visível — ative "Visível no banco" para aparecer nas buscas
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove confirm */}
      <Dialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <DialogContent className="glass-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Remover do banco?
            </DialogTitle>
            <DialogDescription>
              Você deixará de aparecer nas buscas de artistas. Pode ser reativado a qualquer momento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setRemoveConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRemoveFromBank}>Confirmar remoção</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
