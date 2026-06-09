import { useMemo, useState } from "react";
import {
  Calendar,
  ExternalLink,
  ClipboardList,
  Award,
  MoreVertical,
  Trash2,
  Trophy,
  Mic2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ApplicationStatusMenu from "./ApplicationStatusMenu";
import type {
  ApplicationStatus,
  EditalApplication,
} from "@/hooks/useEditalApplications";

function formatBrDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso + "T12:00:00-03:00"));
  } catch {
    return iso;
  }
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  try {
    const d = new Date(iso + "T12:00:00-03:00");
    return Math.round((d.getTime() - Date.now()) / 86400000);
  } catch {
    return null;
  }
}

type Group = "preparando" | "inscrito" | "resultado";

const GROUP_TITLE: Record<Group, string> = {
  preparando: "Em preparação",
  inscrito: "Inscritas",
  resultado: "Resultados",
};

const GROUP_HELP: Record<Group, string> = {
  preparando: "Você marcou interesse e ainda está organizando a inscrição.",
  inscrito: "Inscrição enviada — agora é aguardar.",
  resultado: "Candidaturas com resultado registrado.",
};

interface Props {
  applications: EditalApplication[];
  onOpen: (a: EditalApplication) => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void | Promise<void>;
  onRegisterResult: (a: EditalApplication) => void;
  onDelete: (id: string) => void | Promise<void>;
  deletingId?: string | null;
}

export default function ApplicationsBoard({
  applications,
  onOpen,
  onStatusChange,
  onRegisterResult,
  onDelete,
  deletingId,
}: Props) {
  const [confirm, setConfirm] = useState<EditalApplication | null>(null);

  const groups = useMemo(() => {
    const g: Record<Group, EditalApplication[]> = {
      preparando: [],
      inscrito: [],
      resultado: [],
    };
    for (const a of applications) {
      if (a.resultado || a.status === "resultado") g.resultado.push(a);
      else if (a.status === "inscrito") g.inscrito.push(a);
      else g.preparando.push(a);
    }
    const sortByPrazo = (xs: EditalApplication[]) =>
      [...xs].sort((a, b) => {
        const pa = a.edital?.prazo || "";
        const pb = b.edital?.prazo || "";
        if (!pa && !pb) return 0;
        if (!pa) return 1;
        if (!pb) return -1;
        return pa.localeCompare(pb);
      });
    return {
      preparando: sortByPrazo(g.preparando),
      inscrito: sortByPrazo(g.inscrito),
      resultado: sortByPrazo(g.resultado),
    };
  }, [applications]);

  return (
    <div className="space-y-6">
      {(["preparando", "inscrito", "resultado"] as Group[]).map((group) => {
        const items = groups[group];
        return (
          <section key={group}>
            <div className="flex items-baseline gap-2 mb-2">
              <h3 className="text-sm font-semibold">{GROUP_TITLE[group]}</h3>
              <span className="text-[11px] text-muted-foreground">
                {items.length} {items.length === 1 ? "candidatura" : "candidaturas"}
              </span>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground italic px-1">
                {GROUP_HELP[group]}
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((a) => (
                  <ApplicationRow
                    key={a.id}
                    application={a}
                    onOpen={onOpen}
                    onStatusChange={onStatusChange}
                    onRegisterResult={onRegisterResult}
                    onAskDelete={() => setConfirm(a)}
                    deleting={deletingId === a.id}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir candidatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove apenas o registro da sua lista. A oportunidade
              continua disponível em Explorar.
              {confirm?.edital?.titulo ? (
                <span className="block mt-2 text-foreground font-medium">
                  {confirm.edital.titulo}
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirm) onDelete(confirm.id);
                setConfirm(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface RowProps {
  application: EditalApplication;
  onOpen: (a: EditalApplication) => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void | Promise<void>;
  onRegisterResult: (a: EditalApplication) => void;
  onAskDelete: () => void;
  deleting?: boolean;
}

function ApplicationRow({
  application: a,
  onOpen,
  onStatusChange,
  onRegisterResult,
  onAskDelete,
  deleting,
}: RowProps) {
  const isPalco = a.tipo === "palco";
  const TypeIcon = isPalco ? Mic2 : Trophy;
  const isFinal = !!a.resultado;
  const dLeft = !isFinal ? daysUntil(a.edital?.prazo) : null;
  const titulo = a.edital?.titulo || "Oportunidade removida";

  return (
    <Card
      className="rounded-[0.875rem] cursor-pointer hover:bg-card/80 transition-colors"
      onClick={() => onOpen(a)}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div
            className={
              "h-9 w-9 rounded-[0.7rem] flex items-center justify-center shrink-0 " +
              (isPalco
                ? "bg-warning/15 text-warning-foreground"
                : "bg-primary/10 text-primary")
            }
          >
            <TypeIcon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold leading-snug truncate">
              {titulo}
            </h4>
            <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap text-[11px] text-muted-foreground mt-0.5">
              {a.edital?.orgao && <span className="truncate max-w-[12rem]">{a.edital.orgao}</span>}
              {a.edital?.estado && <span>{a.edital.estado}</span>}
              {a.edital?.prazo && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatBrDate(a.edital.prazo) || a.edital.prazo}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
              <ApplicationStatusMenu
                status={a.status as ApplicationStatus}
                onChange={(s) => onStatusChange(a.id, s)}
              />
              {a.resultado && (
                <Badge variant="outline" className="text-[10px]">
                  {a.resultado === "aprovado"
                    ? "Aprovado"
                    : a.resultado === "reprovado"
                      ? "Reprovado"
                      : a.resultado === "lista_espera"
                        ? "Lista de espera"
                        : "Desistência"}
                  {a.valor_aprovado
                    ? ` · R$ ${a.valor_aprovado.toLocaleString("pt-BR")}`
                    : ""}
                </Badge>
              )}
              {dLeft !== null && (
                dLeft < 0 ? (
                  <Badge variant="outline" className="text-[10px] bg-destructive/15 text-destructive border-destructive/40">
                    Vencido há {Math.abs(dLeft)}d
                  </Badge>
                ) : dLeft <= 7 ? (
                  <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning-foreground border-warning/40">
                    {dLeft === 0 ? "Vence hoje" : `Faltam ${dLeft}d`}
                  </Badge>
                ) : null
              )}
            </div>
          </div>

          <div
            className="flex items-center gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {a.status === "inscrito" && !a.resultado && a.edital && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs hidden sm:inline-flex"
                onClick={() => onRegisterResult(a)}
              >
                <Award className="h-3 w-3 mr-1" /> Resultado
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {a.edital && (
                  <DropdownMenuItem onClick={() => onOpen(a)}>
                    <ClipboardList className="h-3.5 w-3.5 mr-2" />
                    Abrir candidatura
                  </DropdownMenuItem>
                )}
                {a.edital?.link && (
                  <DropdownMenuItem asChild>
                    <a href={a.edital.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-2" />
                      Abrir portal oficial
                    </a>
                  </DropdownMenuItem>
                )}
                {a.status === "inscrito" && !a.resultado && a.edital && (
                  <DropdownMenuItem onClick={() => onRegisterResult(a)}>
                    <Award className="h-3.5 w-3.5 mr-2" />
                    Registrar resultado
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onAskDelete}
                  disabled={deleting}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Excluir candidatura
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
