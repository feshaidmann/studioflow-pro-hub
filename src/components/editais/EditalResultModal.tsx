import { useState } from "react";
import { Trophy, X, Award, ThumbsDown, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateApplication, type EditalApplication, type ResultadoType, RESULTADO_LABELS } from "@/hooks/useEditalApplications";

interface Props {
  application: EditalApplication;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditalResultModal({ application, open, onOpenChange }: Props) {
  const updateApp = useUpdateApplication();
  const [resultado, setResultado] = useState<ResultadoType>(application.resultado || "aprovado");
  const [valorAprovado, setValorAprovado] = useState(application.valor_aprovado?.toString() || "");
  const [dataResultado, setDataResultado] = useState(application.data_resultado || new Date().toISOString().slice(0, 10));
  const [motivoRecusa, setMotivoRecusa] = useState(application.motivo_recusa || "");
  const [licoesAprendidas, setLicoesAprendidas] = useState(application.licoes_aprendidas || "");

  const handleSave = () => {
    updateApp.mutate({
      id: application.id,
      status: "resultado",
      resultado,
      valor_aprovado: resultado === "aprovado" && valorAprovado ? parseFloat(valorAprovado) : null,
      data_resultado: dataResultado || null,
      motivo_recusa: motivoRecusa,
      licoes_aprendidas: licoesAprendidas,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Registrar Resultado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-1">
            {application.edital?.titulo || "Edital"}
          </p>

          <div>
            <Label className="text-xs">Resultado</Label>
            <Select value={resultado} onValueChange={(v) => setResultado(v as ResultadoType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="aprovado">
                  <span className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-green-600" /> Aprovado</span>
                </SelectItem>
                <SelectItem value="reprovado">
                  <span className="flex items-center gap-1.5"><ThumbsDown className="h-3.5 w-3.5 text-red-600" /> Reprovado</span>
                </SelectItem>
                <SelectItem value="lista_espera">
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-600" /> Lista de espera</span>
                </SelectItem>
                <SelectItem value="desistencia">
                  <span className="flex items-center gap-1.5"><LogOut className="h-3.5 w-3.5" /> Desistência</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Data do resultado</Label>
            <Input type="date" value={dataResultado} onChange={(e) => setDataResultado(e.target.value)} />
          </div>

          {resultado === "aprovado" && (
            <div>
              <Label className="text-xs">Valor aprovado (R$)</Label>
              <Input type="number" value={valorAprovado} onChange={(e) => setValorAprovado(e.target.value)} placeholder="0,00" />
            </div>
          )}

          {resultado === "reprovado" && (
            <div>
              <Label className="text-xs">Motivo da recusa</Label>
              <Textarea value={motivoRecusa} onChange={(e) => setMotivoRecusa(e.target.value)} placeholder="O que foi apontado como motivo?" rows={2} />
            </div>
          )}

          <div>
            <Label className="text-xs">Lições aprendidas</Label>
            <p className="text-[10px] text-muted-foreground mb-1">
              {resultado === "aprovado"
                ? "O que funcionou bem? Isso será usado como referência em candidaturas futuras."
                : resultado === "reprovado"
                ? "O que melhorar? A IA usará essas lições para ajustar textos futuros."
                : "O que aprendeu com essa candidatura?"}
            </p>
            <Textarea value={licoesAprendidas} onChange={(e) => setLicoesAprendidas(e.target.value)} placeholder="O que aprendeu com essa candidatura?" rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={updateApp.isPending}>
            Salvar resultado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
