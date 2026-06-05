import { useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface RatePartnersModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  members: Member[];
}

interface Rating {
  stars: number;
  notes: string;
}

export default function RatePartnersModal({
  open,
  onClose,
  projectId,
  projectName,
  members,
}: RatePartnersModalProps) {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [hovered, setHovered] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const setStars = (memberId: string, stars: number) => {
    setRatings((prev) => ({ ...prev, [memberId]: { ...(prev[memberId] || { notes: "" }), stars } }));
  };

  const setNotes = (memberId: string, notes: string) => {
    setRatings((prev) => ({ ...prev, [memberId]: { ...(prev[memberId] || { stars: 0 }), notes } }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    const inserts = members
      .filter((m) => (ratings[m.id]?.stars ?? 0) > 0)
      .map((m) => ({
        user_id: user.id,
        project_id: projectId,
        professional_name: m.name,
        professional_email: m.email,
        stars: ratings[m.id].stars,
        notes: ratings[m.id].notes || "",
      }));

    if (inserts.length > 0) {
      const { error } = await supabase.from("professional_ratings").insert(inserts);
      if (error) {
        toast.error("Erro ao salvar avaliações: " + error.message);
        setSubmitting(false);
        return;
      }
    }

    toast.success("Avaliações salvas! Obrigado pelo feedback.");
    setSubmitting(false);
    onClose();
  };

  const ratedCount = members.filter((m) => (ratings[m.id]?.stars ?? 0) > 0).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            Avalie os parceiros
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{projectName}</span> foi concluído!
            Avalie quem participou — o feedback ajuda a qualificar profissionais na plataforma.
          </DialogDescription>
        </DialogHeader>

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum parceiro registrado neste projeto.
          </p>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {members.map((member, i) => {
              const stars = ratings[member.id]?.stars ?? 0;
              const hoveredStars = hovered[member.id] ?? 0;
              return (
                <div key={member.id}>
                  {i > 0 && <Separator className="mb-4" />}
                  <div className="space-y-3">
                    {/* Member identity */}
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-sm font-semibold text-primary shrink-0 select-none">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm leading-tight truncate">{member.name}</p>
                        {member.role && (
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        )}
                      </div>
                    </div>

                    {/* Star rating */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => {
                        const active = (hoveredStars || stars) >= s;
                        return (
                          <button
                            key={s}
                            type="button"
                            className="transition-transform hover:scale-110 focus:outline-none"
                            onMouseEnter={() => setHovered((h) => ({ ...h, [member.id]: s }))}
                            onMouseLeave={() => setHovered((h) => ({ ...h, [member.id]: 0 }))}
                            onClick={() => setStars(member.id, s)}
                          >
                            <Star
                              className={`h-7 w-7 transition-colors ${
                                active
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "fill-transparent text-muted-foreground/40"
                              }`}
                            />
                          </button>
                        );
                      })}
                      {stars > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {["", "Ruim", "Regular", "Bom", "Ótimo", "Excelente"][stars]}
                        </span>
                      )}
                    </div>

                    {/* Notes (optional) */}
                    {stars > 0 && (
                      <Textarea
                        placeholder="Observações opcionais (ex: pontual, comunicativo, entregou no prazo...)"
                        value={ratings[member.id]?.notes ?? ""}
                        onChange={(e) => setNotes(member.id, e.target.value)}
                        rows={2}
                        className="text-sm resize-none"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Pular
          </Button>
          <Button
            size="sm"
            className="neon-glow gap-2"
            onClick={handleSubmit}
            disabled={submitting || ratedCount === 0}
          >
            {submitting ? "Salvando..." : `Enviar avaliações${ratedCount > 0 ? ` (${ratedCount})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
