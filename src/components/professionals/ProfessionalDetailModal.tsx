import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Mail, MessageCircle, Star, Briefcase, CheckCircle2, XCircle, Globe,
  ChevronDown, ChevronUp, Pencil, Send, ExternalLink,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/contexts/ProjectContext";
import { useProfessionalMetrics } from "@/hooks/useProfessionalMetrics";
import type { Professional } from "./types";
import { avatarColor, avatarInitials } from "./types";

const STORAGE_KEY = "professionals.show_financial";

interface Props {
  professional: Professional | null;
  onClose: () => void;
  onEdit: (p: Professional) => void;
}

export function ProfessionalDetailModal({ professional, onClose, onEdit }: Props) {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { metrics, loading } = useProfessionalMetrics(professional);
  const [showFinancial, setShowFinancial] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, showFinancial ? "1" : "0"); } catch {}
  }, [showFinancial]);

  if (!professional) return null;

  const memberSince = professional.created_at
    ? format(new Date(professional.created_at), "MMM 'de' yyyy", { locale: ptBR })
    : "—";

  const phoneDigits = (professional.phone || "").replace(/\D/g, "");
  const hasWhatsapp = phoneDigits.length >= 10;

  const activeProjects = projects.filter((p) => !p.completed);

  const handleInvite = (projectId: string) => {
    setInviteOpen(false);
    onClose();
    navigate(`/projects/${projectId}?tab=team`);
  };

  return (
    <Dialog open={!!professional} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogDescription className="sr-only">
            Detalhes do contato {professional.name}
          </DialogDescription>
          <div className="flex items-center gap-3 pt-1">
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-semibold text-foreground/70 shrink-0"
              style={{ background: avatarColor(professional.name) }}
              aria-hidden
            >
              {avatarInitials(professional.name)}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg leading-tight truncate">{professional.name}</DialogTitle>
              {professional.specialty?.trim() && (
                <p className="text-sm text-primary font-medium mt-0.5 truncate">{professional.specialty.trim()}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {professional.active
                  ? <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0 h-4"><CheckCircle2 className="h-2.5 w-2.5 text-success" /> Ativo</Badge>
                  : <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-4 text-muted-foreground"><XCircle className="h-2.5 w-2.5" /> Inativo</Badge>}
                {professional.allow_global_listing && (
                  <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-4 text-primary border-primary/30">
                    <Globe className="h-2.5 w-2.5" /> No banco global
                  </Badge>
                )}
                {metrics?.publicProfile && (
                  <Link to={`/u/${metrics.publicProfile.username}`} onClick={onClose}>
                    <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-4 hover:bg-primary/10 cursor-pointer">
                      <ExternalLink className="h-2.5 w-2.5" /> Perfil público
                    </Badge>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Métricas principais */}
          <div className="grid grid-cols-4 gap-2 rounded-lg bg-muted/40 border border-border p-3">
            <Stat label="Projetos juntos" value={loading ? null : String(metrics?.projectCount ?? 0)} />
            <Stat label="Na plataforma" value={loading ? null : String(metrics?.platformProjectCount ?? 0)} />
            <Stat
              label={metrics?.ratingCount ? `Nota (${metrics.ratingCount})` : "Nota média"}
              value={loading ? null : (metrics?.avgRating != null ? metrics.avgRating.toFixed(1) : "—")}
              icon={metrics?.avgRating != null ? <Star className="h-3 w-3 fill-primary text-primary" /> : undefined}
            />
            <Stat label="Na agenda" value={memberSince} small />
          </div>

          {/* Toggle financeiro */}
          {!loading && metrics && (metrics.avgFee !== null || metrics.avgDeliveryDays !== null) && (
            <div>
              <button
                onClick={() => setShowFinancial(!showFinancial)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showFinancial ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showFinancial ? "Ocultar dados financeiros" : "Mostrar dados financeiros"}
              </button>
              {showFinancial && (
                <div className="flex gap-2 mt-2">
                  {metrics.avgFee !== null && (
                    <div className="flex-1 rounded-lg bg-muted/30 border border-border/40 p-2.5 text-center">
                      <p className="text-sm font-bold text-primary">
                        R${metrics.avgFee.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Cachê médio</p>
                    </div>
                  )}
                  {metrics.avgDeliveryDays !== null && (
                    <div className="flex-1 rounded-lg bg-muted/30 border border-border/40 p-2.5 text-center">
                      <p className="text-sm font-bold text-primary">{metrics.avgDeliveryDays}d</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Prazo médio</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Histórico */}
          {!loading && metrics && metrics.collaborationHistory.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Briefcase className="h-3 w-3" /> Histórico de colaboração
              </p>
              <div className={`space-y-1.5 ${metrics.collaborationHistory.length > 4 ? "max-h-[200px] overflow-y-auto pr-1" : ""}`}>
                {metrics.collaborationHistory.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-muted/30 border border-border/40">
                    <div className="flex-1 min-w-0">
                      {h.projectId ? (
                        <Link to={`/projects/${h.projectId}`} className="font-medium hover:text-primary transition-colors" onClick={onClose}>
                          {h.projectName}
                        </Link>
                      ) : <span className="font-medium">{h.projectName}</span>}
                      {h.role && <span className="text-muted-foreground"> · {h.role}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {showFinancial && h.fee > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          R${h.fee.toLocaleString("pt-BR")}
                        </span>
                      )}
                      {h.completed
                        ? <Badge variant="secondary" className="text-[9px] h-4 px-1.5 gap-0.5"><CheckCircle2 className="h-2.5 w-2.5 text-success" /> Concluído</Badge>
                        : h.deliveryStatus === "entregue"
                          ? <Badge variant="secondary" className="text-[9px] h-4 px-1.5 gap-0.5"><CheckCircle2 className="h-2.5 w-2.5 text-success" /> Entregue</Badge>
                          : <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-muted-foreground">Em andamento</Badge>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Contato */}
          <div className="space-y-2">
            {professional.email && (
              <a href={`mailto:${professional.email}`} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                <Mail className="h-4 w-4 text-primary/60 group-hover:text-primary shrink-0" />
                <span className="truncate">{professional.email}</span>
              </a>
            )}
            {professional.phone && hasWhatsapp && (
              <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                <MessageCircle className="h-4 w-4 text-primary/60 group-hover:text-primary shrink-0" />
                {professional.phone}
              </a>
            )}
            {professional.phone && !hasWhatsapp && (
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <MessageCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                {professional.phone}
              </div>
            )}
          </div>

          {/* Bio */}
          {professional.bio && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Observações</p>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{professional.bio}</p>
              </div>
            </>
          )}

          {/* Convidar para projeto */}
          {inviteOpen && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium">Selecione o projeto:</p>
              {activeProjects.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum projeto ativo. Crie um projeto primeiro.</p>
              ) : (
                <Select onValueChange={handleInvite}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Escolher projeto..." /></SelectTrigger>
                  <SelectContent>
                    {activeProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-[10px] text-muted-foreground">Você será levado à aba Equipe do projeto para enviar o convite.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 mt-2 flex-wrap sm:flex-nowrap">
          <Button variant="outline" size="sm" onClick={() => setInviteOpen(!inviteOpen)} className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> Convidar
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(professional)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
          <Button size="sm" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, icon, small }: { label: string; value: string | null; icon?: React.ReactNode; small?: boolean }) {
  return (
    <div className="text-center">
      {value === null
        ? <div className="h-5 w-10 mx-auto bg-muted rounded animate-pulse" />
        : (
          <div className="flex items-center justify-center gap-0.5">
            <p className={small ? "text-xs font-semibold text-foreground" : "text-base font-bold text-primary"}>{value}</p>
            {icon}
          </div>
        )
      }
      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
    </div>
  );
}
