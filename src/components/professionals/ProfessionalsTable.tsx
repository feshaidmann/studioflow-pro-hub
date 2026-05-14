import { Link } from "react-router-dom";
import { MoreVertical, Pencil, Trash2, Star, Send } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export function ProfessionalsTable({ rows, ratingsMap, allocationsMap, onOpen, onEdit, onDelete, onToggleFavorite, onInvite }: Props) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Especialidade</TableHead>
            <TableHead>Nota</TableHead>
            <TableHead>Em projeto</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => {
            const rating = ratingsMap[p.name];
            const projects = allocationsMap[p.name] ?? [];
            return (
              <TableRow
                key={p.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer hover:bg-primary/5 transition-colors"
                onClick={() => onOpen(p)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(p); } }}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-foreground/70 shrink-0"
                      style={{ background: avatarColor(p.name) }}
                      aria-hidden
                    >
                      {avatarInitials(p.name)}
                    </div>
                    <span className="font-medium">{p.name}</span>
                    {p.favorite && <Star className="h-3 w-3 fill-chart-3 text-chart-3 shrink-0" aria-label="Favorito" />}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.email}</TableCell>
                <TableCell className="text-muted-foreground">{p.phone || "—"}</TableCell>
                <TableCell>{p.specialty || "—"}</TableCell>
                <TableCell>
                  {rating
                    ? <span className="flex items-center gap-1 text-sm font-medium">
                        <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                        {rating.avg.toFixed(1)}
                        <span className="text-[10px] text-muted-foreground">({rating.count})</span>
                      </span>
                    : <span className="text-muted-foreground/50 text-xs">—</span>
                  }
                </TableCell>
                <TableCell>
                  {projects.length > 0
                    ? <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                        {projects.slice(0, 2).map((proj) => (
                          <Link key={proj.id} to={`/projects/${proj.id}`} title={`Abrir ${proj.name}`}>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 max-w-[120px] truncate hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer">{proj.name}</Badge>
                          </Link>
                        ))}
                        {projects.length > 2 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">+{projects.length - 2}</Badge>
                        )}
                      </div>
                    : <span className="text-muted-foreground/50 text-xs">—</span>
                  }
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações">
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
