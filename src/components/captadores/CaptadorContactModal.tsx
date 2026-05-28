import { Mail, MessageCircle, Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { CaptadorProfile } from "@/hooks/useCaptadores";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  captador: CaptadorProfile | null;
  defaultSubject?: string;
  defaultMessage?: string;
}

function onlyDigits(s: string) { return (s || "").replace(/\D/g, ""); }

export default function CaptadorContactModal({ open, onOpenChange, captador, defaultSubject, defaultMessage }: Props) {
  const [subject, setSubject] = useState(defaultSubject ?? "Proposta de apresentação");
  const [message, setMessage] = useState(defaultMessage ?? "");
  const [copied, setCopied] = useState(false);

  if (!captador) return null;

  const phoneDigits = onlyDigits(captador.whatsapp);
  const mailtoHref = captador.public_email
    ? `mailto:${captador.public_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
    : null;
  const whatsHref = phoneDigits ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message || subject)}` : null;

  const copy = async () => {
    await navigator.clipboard.writeText(`${subject}\n\n${message}`);
    setCopied(true);
    toast.success("Mensagem copiada");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Contatar {captador.display_name}</DialogTitle>
          <DialogDescription>
            Edite a mensagem e escolha o canal. O MusicOS.ai não envia automaticamente — você dispara via e-mail/WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Assunto</Label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="mt-1 text-xs font-mono"
              placeholder="Olá! Sou artista independente e quero apresentar meu projeto…"
            />
          </div>

          <div className="rounded-lg border border-border bg-secondary/20 p-3 text-xs space-y-1">
            {captador.public_email && <p><span className="text-muted-foreground">E-mail:</span> {captador.public_email}</p>}
            {captador.whatsapp && <p><span className="text-muted-foreground">WhatsApp:</span> {captador.whatsapp}</p>}
            {!captador.public_email && !captador.whatsapp && (
              <p className="text-muted-foreground">Este captador não publicou contatos. Veja o perfil público.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {mailtoHref && (
              <Button size="sm" asChild className="gap-1.5">
                <a href={mailtoHref} target="_blank" rel="noopener noreferrer"><Mail className="h-3.5 w-3.5" /> Enviar por e-mail</a>
              </Button>
            )}
            {whatsHref && (
              <Button size="sm" variant="outline" asChild className="gap-1.5">
                <a href={whatsHref} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={copy} className="gap-1.5 ml-auto">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copiar
            </Button>
            {captador.username && (
              <Button size="sm" variant="ghost" asChild className="gap-1.5">
                <a href={`/u/${captador.username}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Perfil
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
