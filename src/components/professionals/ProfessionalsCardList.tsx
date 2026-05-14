import { Link } from "react-router-dom";
import { MoreVertical, Pencil, Trash2, Star, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Professional, RatingsMap, AllocationsMap } from "./types";
import { avatarColor, avatarInitials } from "./types";

interface Props {
  rows: Professional[];
  ratingsMap: RatingsMap;
  allocationsMap: AllocationsMap;
  onOpen: (p: Professional) => void;
  onEdit: (p: Professional) => void;
  onDelete: (p: Professional) => void;
  onToggleFavorite: (p: Professional) => void;
  onInvite: (p: Professional) => void;
}

export function ProfessionalsCardList({ rows, ratingsMap, allocationsMap, onOpen, onEdit, onDelete, onToggleFavorite, onInvite }: Props) {
  return (
    <div className="space-y-2">
      {rows.map((p) => {
        const rating = ratingsMap[p.name];
        const projects = allocationsMap[p.name] ?? [];
        return (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(p)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(p); } }}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-primary/5 transition-colors cursor-pointer"
          >
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold text-foreground/70 shrink-0"
              style={{ background: avatarColor(p.name) }}
              aria-hidden
            >
              {avatarInitials(p.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-sm truncate">{p.name}</p>
                {p.favorite && <Star className="h-3 w-3 fill-chart-3 text-chart-3 shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {p.specialty || "Sem especialidade"}
              </p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                {rating && (
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Star className="h-2.5 w-2.5 fill-primary text-primary" />
                    {rating.avg.toFixed(1)}
                  </span>
                )}
                {projects.slice(0, 1).map((proj) => (
                  <Link key={proj.id} to={`/projects/${proj.id}`}>
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 max-w-[110px] truncate">
                      {proj.name}
                    </Badge>
                  </Link>
                ))}
                {projects.length > 1 && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">+{projects.length - 1}</Badge>
                )}
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Ações">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onToggleFavorite(p)}>
                    <Star className={`h-3.5 w-3.5 mr-2 ${p.favorite ? "fill-chart-3 text-chart-3" : ""}`} />
                    {p.favorite ? "Remover dos favoritos" : "Marcar como favorito"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onInvite(p)}>
                    <Send className="h-3.5 w-3.5 mr-2" /> Convidar para projeto
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(p)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(p)} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}
