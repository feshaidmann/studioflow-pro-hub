import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Send, Loader2, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AIMarkdownContent } from "@/components/ui/ai-markdown-content";

interface Message {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface ProjectAISheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectData: string; // Pre-formatted context string
  mode?: "project" | "finance";
  title?: string;
  initialPrompt?: string;
  chips?: Array<{ label: string; msg: string }>;
}

export default function ProjectAISheet({
  open, onOpenChange, projectData, mode = "project",
  title = "Assistente IA do Projeto",
  initialPrompt,
  chips = [],
}: ProjectAISheetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialSent = useRef(false);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Send initial prompt when sheet opens
  useEffect(() => {
    if (open && initialPrompt && !initialSent.current && messages.length === 0) {
      initialSent.current = true;
      sendMessage(initialPrompt);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialPrompt]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput("");
      initialSent.current = false;
    }
  }, [open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    let assistantContent = "";
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
        }
        return [...prev, { role: "assistant", content: assistantContent, isStreaming: true }];
      });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Sessão expirada. Faça login novamente.");
        setLoading(false);
        return;
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-ai-assistant`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          projectContext: { projectData },
          mode,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro" }));
        toast.error(err.error || "Erro ao consultar IA");
        setLoading(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) updateAssistant(c);
          } catch { /* partial */ }
        }
      }

      // Finalize streaming flag
      setMessages(prev => prev.map(m => ({ ...m, isStreaming: false })));
    } catch (e) {
      console.error(e);
      toast.error("Erro ao processar resposta da IA");
    }
    setLoading(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            {title}
          </SheetTitle>
        </SheetHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
              <Bot className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {mode === "finance"
                  ? "Pergunte sobre suas finanças — análise de gastos, previsões, otimizações..."
                  : "Pergunte sobre este projeto — próximos passos, problemas, sugestões..."}
              </p>
              {chips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                  {chips.map((chip, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => sendMessage(chip.msg)}
                    >
                      {chip.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div className={cn(
                "rounded-lg px-3 py-2 max-w-[85%] text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60"
              )}>
                {msg.role === "assistant" ? (
                  <AIMarkdownContent content={msg.content || "..."} />
                ) : msg.content}
                {msg.isStreaming && <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5" />}
              </div>
              {msg.role === "user" && (
                <div className="h-6 w-6 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}

          {loading && messages.length === 0 && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border px-3 py-2.5 flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Pergunte algo..."
            className="min-h-[40px] max-h-[100px] resize-none text-sm"
            rows={1}
          />
          <Button size="icon" onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
