import { DollarSign, Calendar, MapPin, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { type Edital } from "@/hooks/useEditais";

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
  } catch { return d; }
}

interface Props {
  editais: Edital[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditalCompareDialog({ editais, open, onOpenChange }: Props) {
  if (editais.length === 0) return null;

  const fields: { label: string; icon: React.ReactNode; getValue: (e: Edital) => string }[] = [
    { label: "Órgão", icon: <MapPin className="h-3 w-3" />, getValue: (e) => e.orgao || "—" },
    { label: "Estado", icon: null, getValue: (e) => e.estado || "—" },
    { label: "Área", icon: null, getValue: (e) => e.area || "—" },
    { label: "Valor", icon: <DollarSign className="h-3 w-3" />, getValue: (e) => e.valor || "—" },
    { label: "Prazo", icon: <Calendar className="h-3 w-3" />, getValue: (e) => formatDate(e.prazo) },
    { label: "Público-alvo", icon: <Users className="h-3 w-3" />, getValue: (e) => e.publico_alvo || "—" },
    { label: "Status", icon: null, getValue: (e) => e.status || "—" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comparar editais ({editais.length})</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-xs text-muted-foreground py-2 pr-3 w-24">Campo</th>
                {editais.map((e) => (
                  <th key={e.id} className="text-left text-xs font-medium py-2 px-2 max-w-[180px]">
                    <span className="line-clamp-2">{e.titulo}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.label} className="border-t border-border/40">
                  <td className="text-xs text-muted-foreground py-2 pr-3 whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      {f.icon}
                      {f.label}
                    </span>
                  </td>
                  {editais.map((e) => (
                    <td key={e.id} className="text-xs py-2 px-2 max-w-[180px]">
                      <span className="line-clamp-2">{f.getValue(e)}</span>
                    </td>
                  ))}
                </tr>
              ))}
              {/* Resumo row */}
              <tr className="border-t border-border/40">
                <td className="text-xs text-muted-foreground py-2 pr-3">Resumo</td>
                {editais.map((e) => (
                  <td key={e.id} className="text-xs py-2 px-2 max-w-[180px]">
                    <span className="line-clamp-4 text-muted-foreground">{e.resumo || "—"}</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
