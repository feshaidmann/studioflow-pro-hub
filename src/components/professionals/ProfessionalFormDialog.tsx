import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  SPECIALTY_OPTIONS, SPECIALTY_NONE, SPECIALTY_OTHER, isPresetSpecialty,
} from "@/constants/specialtyOptions";
import { maskPhone, isValidPhone, type Professional } from "./types";

const CUSTOM_SPECIALTY_MAX = 60;

const schema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().max(20).default("").refine(isValidPhone, "Telefone deve ter 10 ou 11 dígitos"),
  specialty: z.string().trim().max(100).default(""),
  genres_raw: z.string().trim().max(300).default(""),
  bio: z.string().trim().max(500).default(""),
  active: z.boolean().default(true),
  allow_global_listing: z.boolean().default(false),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editTarget: Professional | null;
  existingEmails: string[];
  onSaved: () => void;
  onRequestEdit?: (email: string) => void;
}

export function ProfessionalFormDialog({ open, onOpenChange, editTarget, existingEmails, onSaved, onRequestEdit }: Props) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [acknowledgedDuplicate, setAcknowledgedDuplicate] = useState(false);

  const [specialtyMode, setSpecialtyMode] = useState<string>(SPECIALTY_NONE);
  const [customSpecialty, setCustomSpecialty] = useState<string>("");
  const [specialtyError, setSpecialtyError] = useState<string>("");

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", specialty: "", genres_raw: "", bio: "", active: true, allow_global_listing: false },
  });

  const activeValue = watch("active");
  const globalValue = watch("allow_global_listing");
  const phoneValue = watch("phone");
  const emailValue = watch("email");

  const trimmedEmail = (emailValue || "").trim().toLowerCase();
  const isDuplicate =
    !editTarget &&
    trimmedEmail.length > 0 &&
    existingEmails.some((e) => e.toLowerCase() === trimmedEmail);

  useEffect(() => {
    if (!open) return;
    setAcknowledgedDuplicate(false);
    setSpecialtyError("");
    if (editTarget) {
      const stored = (editTarget.specialty || "").trim();
      reset({
        name: editTarget.name,
        email: editTarget.email,
        phone: editTarget.phone || "",
        specialty: stored,
        genres_raw: (editTarget.genres ?? []).join(", "),
        bio: editTarget.bio || "",
        active: editTarget.active,
        allow_global_listing: editTarget.allow_global_listing,
      });
      if (!stored) {
        setSpecialtyMode(SPECIALTY_NONE);
        setCustomSpecialty("");
      } else if (isPresetSpecialty(stored)) {
        setSpecialtyMode(stored);
        setCustomSpecialty("");
      } else {
        setSpecialtyMode(SPECIALTY_OTHER);
        setCustomSpecialty(stored.slice(0, CUSTOM_SPECIALTY_MAX));
      }
    } else {
      reset({ name: "", email: "", phone: "", specialty: "", genres_raw: "", bio: "", active: true, allow_global_listing: false });
      setSpecialtyMode(SPECIALTY_NONE);
      setCustomSpecialty("");
    }
  }, [open, editTarget, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!user) return;

    let finalSpecialty = "";
    if (specialtyMode === SPECIALTY_OTHER) {
      finalSpecialty = customSpecialty.trim();
      if (finalSpecialty.length < 2) {
        setSpecialtyError("Descreva a especialidade (mín. 2 caracteres)");
        return;
      }
    } else if (specialtyMode !== SPECIALTY_NONE) {
      finalSpecialty = specialtyMode;
    }

    // Block submit if duplicate detected and user hasn't explicitly acknowledged it
    if (!editTarget && isDuplicate && !acknowledgedDuplicate) {
      return;
    }

    setSubmitting(true);
    const genres = values.genres_raw
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
    const { genres_raw: _gr, ...rest } = values;
    const payload = { ...rest, specialty: finalSpecialty, genres };

    if (editTarget) {
      const { error } = await supabase.from("professionals").update(payload).eq("id", editTarget.id);
      if (error) toast.error("Erro ao atualizar: " + error.message);
      else { toast.success("Contato atualizado!"); onSaved(); onOpenChange(false); }
    } else {
      const { error } = await supabase.from("professionals").insert([{
        ...payload,
        name: payload.name!,
        email: payload.email!,
        user_id: user.id,
      }]);
      if (error) toast.error("Erro ao cadastrar: " + error.message);
      else { toast.success("Contato salvo!"); onSaved(); onOpenChange(false); }
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTarget ? "Editar Contato" : "Novo Contato"}</DialogTitle>
          <DialogDescription>
            {editTarget ? "Atualize as informações do seu contato." : "Adicione um músico, engenheiro ou colaborador à sua agenda."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" {...register("name")} placeholder="Nome completo" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="email@exemplo.com"
              aria-invalid={isDuplicate || !!errors.email}
              aria-describedby={isDuplicate ? "email-duplicate-hint" : undefined}
              className={isDuplicate ? "border-amber-500/60 focus-visible:ring-amber-500/40" : undefined}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            {isDuplicate && !errors.email && (
              <p id="email-duplicate-hint" className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Este e-mail já existe na sua agenda.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phoneValue || ""}
                onChange={(e) => setValue("phone", maskPhone(e.target.value), { shouldValidate: true })}
                placeholder="(11) 99999-9999"
                inputMode="tel"
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              <p className="text-[10px] text-muted-foreground">Usado para gerar link do WhatsApp.</p>
            </div>
            <div className="space-y-1">
              <Label>Especialidade</Label>
              <Select
                value={specialtyMode}
                onValueChange={(v) => {
                  setSpecialtyMode(v);
                  setSpecialtyError("");
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SPECIALTY_NONE}>Nenhuma</SelectItem>
                  {SPECIALTY_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  <SelectItem value={SPECIALTY_OTHER}>Outro…</SelectItem>
                </SelectContent>
              </Select>
              {specialtyMode === SPECIALTY_OTHER && (
                <>
                  <Input
                    className="mt-1"
                    value={customSpecialty}
                    onChange={(e) => {
                      setCustomSpecialty(e.target.value.slice(0, CUSTOM_SPECIALTY_MAX));
                      if (specialtyError) setSpecialtyError("");
                    }}
                    placeholder="Descreva a especialidade"
                    maxLength={CUSTOM_SPECIALTY_MAX}
                    aria-invalid={!!specialtyError}
                  />
                  {specialtyError && (
                    <p className="text-xs text-destructive">{specialtyError}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {customSpecialty.length}/{CUSTOM_SPECIALTY_MAX}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="genres_raw">Gêneros musicais</Label>
            <Input id="genres_raw" {...register("genres_raw")} placeholder="Ex: MPB, Rock, Jazz" />
            <p className="text-[10px] text-muted-foreground">Separe por vírgula. Usado para filtros no marketplace.</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="bio">Observações</Label>
            <Textarea id="bio" {...register("bio")} placeholder="Disponibilidade, estilos, observações..." rows={3} className="resize-none" />
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              <Switch id="active" checked={activeValue} onCheckedChange={(v) => setValue("active", v)} />
              <Label htmlFor="active" className="cursor-pointer">Contato ativo</Label>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Switch id="global" checked={globalValue} onCheckedChange={(v) => setValue("allow_global_listing", v)} />
                <Label htmlFor="global" className="cursor-pointer">Aparecer no banco global</Label>
              </div>
              <p className="text-[10px] text-muted-foreground pl-11">
                Outros artistas poderão encontrar este contato pela busca da plataforma. Pode ser desativado a qualquer momento.
              </p>
            </div>
          </div>

          {isDuplicate && (
            <div
              role="alert"
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2"
            >
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm font-medium">E-mail já cadastrado</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Já existe um contato com <strong>{trimmedEmail}</strong> na sua agenda.
                Recomendamos editar o contato existente para manter o histórico de projetos e avaliações
                vinculado a uma única ficha.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {onRequestEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { onRequestEdit(trimmedEmail); onOpenChange(false); }}
                  >
                    Editar contato existente
                  </Button>
                )}
                <Button
                  type="button"
                  variant={acknowledgedDuplicate ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setAcknowledgedDuplicate((v) => !v)}
                  aria-pressed={acknowledgedDuplicate}
                >
                  {acknowledgedDuplicate ? "✓ Vou cadastrar mesmo assim" : "Cadastrar mesmo assim"}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
            <Button type="submit" disabled={submitting || (isDuplicate && !acknowledgedDuplicate)}>
              {submitting ? "Salvando..." : editTarget ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
