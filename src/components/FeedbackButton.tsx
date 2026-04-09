import { useState } from "react";
import { MessageSquarePlus, X, Send, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

const CATEGORIES = [
  { value: "bug", label: "🐛 Bug / Erro" },
  { value: "sugestao", label: "💡 Sugestão" },
  { value: "elogio", label: "🎉 Elogio" },
  { value: "duvida", label: "❓ Dúvida" },
  { value: "geral", label: "💬 Geral" },
];

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("geral");
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Escreva sua mensagem antes de enviar.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("beta_feedback").insert({
      user_id: user.id,
      category,
      message: message.trim(),
      rating: rating ?? null,
      page: location.pathname,
    });
    setLoading(false);
    if (error) {
      toast.error("Erro ao enviar feedback. Tente novamente.");
      return;
    }
    toast.success("Obrigado pelo feedback! Cada opinião conta muito 🙏");
    setOpen(false);
    setMessage("");
    setCategory("geral");
    setRating(null);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Enviar feedback"
        className={cn(
          "fixed bottom-[4.5rem] right-4 z-50 flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary shadow-lg backdrop-blur-sm transition-all hover:bg-primary/20 hover:shadow-[0_0_16px_hsl(var(--primary)/0.4)] active:scale-95",
          "md:bottom-6 md:right-6"
        )}
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden sm:inline">Feedback Beta</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 md:items-center md:justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Enviar Feedback</p>
                <p className="text-xs text-muted-foreground">Sua opinião melhora o StudioFlow</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Categoria
                </label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Mensagem
                </label>
                <Textarea
                  placeholder="O que você achou? Encontrou algum problema ou tem uma sugestão?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  className="text-sm resize-none"
                />
                <p className="text-right text-[10px] text-muted-foreground">
                  {message.length}/1000
                </p>
              </div>

              {/* Star rating */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Avaliação geral (opcional)
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const filled = (hoveredStar ?? rating ?? 0) >= star;
                    return (
                      <button
                        key={star}
                        onClick={() => setRating(rating === star ? null : star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(null)}
                        className="transition-transform hover:scale-110 active:scale-95"
                        aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
                      >
                        <Star
                          className={cn(
                            "h-6 w-6 transition-colors",
                            filled
                              ? "fill-[hsl(var(--warning))] text-[hsl(var(--warning))]"
                              : "text-muted-foreground/40"
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 border-t border-border px-5 py-4">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1 neon-glow gap-2"
                onClick={handleSubmit}
                disabled={loading || !message.trim()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
