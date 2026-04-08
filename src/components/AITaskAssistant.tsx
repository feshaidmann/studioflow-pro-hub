import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sparkles,
  ChevronDown,
  Send,
  Plus,
  Loader2,
  Check,
  Bot,
  User,
  MessageSquarePlus,
  Trash2,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AIConversation, AIMessage } from "@/hooks/useAIConversations";

interface TaskSuggestion {
  description: string;
  priority: "low" | "medium" | "high";
  project_id?: string;
}

interface QuickAction {
  label: string;
  message: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestions?: TaskSuggestion[];
  isStreaming?: boolean;
  quickActions?: QuickAction[];
}

interface ProjectContext {
  projects: Array<{
    id: string;
    name: string;
    artist: string;
    stage: string;
    mixPercent: number;
    projectType?: string;
    totalContractValue?: number | null;
    amountPaid?: number | null;
    estimatedMonths?: number | null;
  }>;
  activeTasks: Array<{ description: string; source: string; dueDate: string | null }>;
  financials: { totalIncome: number; totalExpense: number; profit: number };
  professionals?: Array<{ name: string; specialty: string; bio: string; active: boolean; phone: string }>;
}

export interface AITaskAssistantHandle {
  sendMessage: (msg: string) => void;
}

interface ContextChip {
  label: string;
  msg: string;
  highlight?: boolean; // shows an accent to draw attention
}

interface AITaskAssistantProps {
  context: ProjectContext;
  onAddTask: (description: string, projectId?: string) => Promise<void>;
  alwaysOpen?: boolean;
  contextChips?: ContextChip[];
  // Conversation persistence props
  conversations?: AIConversation[];
  activeConversationId?: string | null;
  savedMessages?: AIMessage[];
  loadingMessages?: boolean;
  onCreateConversation?: (firstMessage: string) => Promise<string | null>;
  onSaveMessage?: (convId: string, role: "user" | "assistant", content: string, suggestions?: unknown) => Promise<void>;
  onSelectConversation?: (id: string) => void;
  onNewConversation?: () => void;
  onDeleteConversation?: (id: string) => Promise<void>;
  onRenameConversation?: (id: string, title: string) => Promise<void>;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-task-assistant`;

const priorityColor: Record<string, string> = {
  high: "text-rose-400 border-rose-400/40 bg-rose-400/10",
  medium: "text-amber-400 border-amber-400/40 bg-amber-400/10",
  low: "text-muted-foreground border-border/40 bg-secondary/50",
};

const WELCOME_QUICK_ACTIONS: QuickAction[] = [
  // Projetos
  { label: "📋 Pendências urgentes", message: "Quais são minhas pendências mais urgentes agora?" },
  { label: "🚀 Próximo passo", message: "Qual é o próximo passo mais importante para avançar nos meus projetos?" },
  { label: "📊 Status dos projetos", message: "Me dá um resumo rápido do status de cada projeto ativo." },
  // Gravação
  { label: "🎙️ Dica de gravação", message: "Me dá dicas práticas para melhorar a qualidade das minhas gravações de voz e instrumentos." },
  { label: "🎚️ Preparar stems", message: "Como devo preparar e exportar os stems de um projeto para mixagem?" },
  // Mix
  { label: "🎛️ EQ e compressão", message: "Explica como usar EQ e compressão de forma eficaz numa mixagem." },
  { label: "🔊 LUFS para streaming", message: "Quais são os alvos de LUFS integrado, True Peak e loudness range para Spotify, YouTube e Apple Music?" },
  // Master
  { label: "✅ Mix pronto?", message: "Quais são os sinais que indicam que um mix está pronto para masterização?" },
  { label: "🧠 Configurar DAW", message: "Quais são as configurações essenciais de um projeto no DAW para começar bem uma sessão de mix?" },
];

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="bg-secondary/60 px-1 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
    }
    return part.split("\n").map((line, j) => {
      const isListItem = line.startsWith("- ") || line.startsWith("• ");
      if (isListItem) {
        return (
          <span key={`${i}-${j}`} className="block pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-primary">
            {line.replace(/^[-•]\s/, "")}
          </span>
        );
      }
      return j === 0 ? line : <span key={`${i}-${j}`}><br />{line}</span>;
    });
  });
}

function formatRelativeDate(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  } catch {
    return dateStr;
  }
}

// Convert saved DB messages to local Message format
function dbMessagesToLocal(dbMsgs: AIMessage[]): Message[] {
  return dbMsgs.map((m) => ({
    role: m.role,
    content: m.content,
    suggestions: m.suggestions as TaskSuggestion[] | undefined,
  }));
}

export const AITaskAssistant = forwardRef<AITaskAssistantHandle, AITaskAssistantProps>(function AITaskAssistant({
  context,
  onAddTask,
  alwaysOpen = false,
  contextChips = [],
  conversations = [],
  activeConversationId = null,
  savedMessages = [],
  loadingMessages = false,
  onCreateConversation,
  onSaveMessage,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
}, ref) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [addedTasks, setAddedTasks] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);
  // Track current conversation id locally (may be null until first message sent)
  const activeConvRef = useRef<string | null>(activeConversationId);
  const sendToAIRef = useRef<(msg: string) => void>(() => {});

  // Expose sendMessage for external chips
  useImperativeHandle(ref, () => ({
    sendMessage: (msg: string) => sendToAIRef.current(msg),
  }));
  const renamedRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // When saved messages change (conversation switched), load them
  useEffect(() => {
    activeConvRef.current = activeConversationId;
    renamedRef.current = false;
    if (savedMessages.length > 0) {
      initializedRef.current = true;
      setMessages(dbMessagesToLocal(savedMessages));
      setAddedTasks(new Set());
    } else if (activeConversationId === null) {
      // New conversation — reset and show welcome
      initializedRef.current = false;
      setMessages([]);
      setAddedTasks(new Set());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, savedMessages]);

  // Show local welcome message on first open (or immediately if alwaysOpen) — no AI call
  useEffect(() => {
    const shouldInit = alwaysOpen ? !initializedRef.current : (open && !initializedRef.current);
    if (shouldInit && savedMessages.length === 0 && !loadingMessages) {
      initializedRef.current = true;
      const welcomeText =
        context.projects.length === 0
          ? "Olá! Sou seu assistente de produção musical integrado ao StudioFlow.\n\nPosso te ajudar com:\n- Projetos — organize estágios, prazos e progresso de mix\n- Técnicas musicais — LUFS, compressão, EQ, sidechain e muito mais\n- Finanças — cachês, custos e margem em tempo real\n\nVocê ainda não tem projetos. Que tal criar o primeiro? Ou me pergunte qualquer coisa sobre produção musical:"
          : `Olá! Aqui está seu panorama atual:\n\n- ${context.projects.length} projeto${context.projects.length > 1 ? "s" : ""} ativo${context.projects.length > 1 ? "s" : ""}${context.projects[0] ? ` (mais recente: ${context.projects[0].name} — ${context.projects[0].stage})` : ""}\n- ${context.activeTasks.length} tarefa${context.activeTasks.length !== 1 ? "s" : ""} pendente${context.activeTasks.length !== 1 ? "s" : ""}\n- Financeiro: R$${context.financials.totalIncome.toFixed(0)} de receita · lucro R$${context.financials.profit.toFixed(0)}\n\nO que você quer fazer agora?`;

      setMessages([{
        role: "assistant",
        content: welcomeText,
        quickActions: WELCOME_QUICK_ACTIONS,
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, alwaysOpen, loadingMessages]);

  async function sendToAI(userContent: string) {
    if (isLoading) return;

    // Strip quickActions from welcome message when user interacts
    setMessages((prev) =>
      prev.map((m) => m.quickActions ? { ...m, quickActions: undefined } : m)
    );

    const userMsg: Message = { role: "user", content: userContent };
    const assistantMsg: Message = { role: "assistant", content: "", isStreaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);
    setInput("");

    // Ensure conversation exists in DB
    let convId = activeConvRef.current;
    if (!convId && onCreateConversation) {
      convId = await onCreateConversation(userContent);
      if (convId) activeConvRef.current = convId;
    }

    // Persist user message
    if (convId && onSaveMessage) {
      await onSaveMessage(convId, "user", userContent);
    }

    const historyMessages = messages
      .filter((m) => !m.quickActions)
      .map((m) => ({ role: m.role, content: m.content }));
    historyMessages.push({ role: "user", content: userContent });

    let assistantContent = "";

    try {
      const session = await import("@/integrations/supabase/client").then((m) =>
        m.supabase.auth.getSession()
      );
      const accessToken = session.data.session?.access_token;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: historyMessages,
          projectsContext: context,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        if (resp.status === 429 || resp.status === 402) {
          toast.error(err.error ?? "Limite de uso atingido");
        } else {
          toast.error("Erro ao conectar com o assistente");
        }
        setMessages((prev) => prev.slice(0, -2));
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;

            if (delta?.content) {
              assistantContent += delta.content;
              const displayContent = assistantContent.replace(/<sugestoes>[\s\S]*$/i, "").trimEnd();
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1 && m.role === "assistant"
                    ? { ...m, content: displayContent, isStreaming: true }
                    : m
                )
              );
            }

            const finishReason = parsed.choices?.[0]?.finish_reason;
            if (finishReason === "stop") { streamDone = true; break; }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      let suggestions: TaskSuggestion[] | undefined;
      let cleanContent = assistantContent;
      const sugestoesMatch = assistantContent.match(/<sugestoes>([\s\S]*?)<\/sugestoes>/i);
      if (sugestoesMatch) {
        try {
          suggestions = JSON.parse(sugestoesMatch[1].trim());
        } catch { /* ignore */ }
        cleanContent = assistantContent.replace(/<sugestoes>[\s\S]*?<\/sugestoes>/i, "").trimEnd();
      }

      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 && m.role === "assistant"
            ? { ...m, content: cleanContent || "Pronto!", isStreaming: false, suggestions }
            : m
        )
      );

      // Persist assistant message
      if (convId && onSaveMessage) {
        await onSaveMessage(convId, "assistant", cleanContent || "Pronto!", suggestions);
      }

      // Auto-rename the conversation with the first response excerpt (once)
      if (convId && !renamedRef.current && onRenameConversation && historyMessages.length === 1) {
        renamedRef.current = true;
        const snippet = (cleanContent || "").slice(0, 60).replace(/\n/g, " ").trim();
        if (snippet) await onRenameConversation(convId, snippet + (cleanContent.length > 60 ? "…" : ""));
      }

    } catch (e) {
      console.error("AI stream error:", e);
      toast.error("Erro ao processar resposta da IA");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }

  sendToAIRef.current = sendToAI;

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    sendToAI(trimmed);
  };

  const handleAddSuggestion = async (suggestion: TaskSuggestion) => {
    await onAddTask(suggestion.description, suggestion.project_id);
    setAddedTasks((prev) => new Set(prev).add(suggestion.description));
    toast.success("Tarefa adicionada ao checklist!");
  };

  // Conversation Selector (shown when alwaysOpen and persistence props provided)
  const showSelector = alwaysOpen && (onNewConversation || conversations.length > 0);
  const activeConv = conversations.find((c) => c.id === activeConversationId);

  const conversationSelector = showSelector ? (
    <div className="flex items-center gap-1.5 min-w-0">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-primary"
        onClick={onNewConversation}
        title="Nova conversa"
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
      </Button>

      {conversations.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[11px] gap-1 min-w-0 max-w-[140px] text-muted-foreground hover:text-foreground"
            >
              <History className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {activeConv ? activeConv.title : "Histórico"}
              </span>
              <ChevronDown className="h-2.5 w-2.5 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 max-h-72 overflow-y-auto">
            {conversations.map((conv) => (
              <DropdownMenuItem
                key={conv.id}
                className={cn(
                  "flex items-start gap-2 py-2 cursor-pointer group",
                  conv.id === activeConversationId && "bg-primary/10"
                )}
                onSelect={() => onSelectConversation?.(conv.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{conv.title}</p>
                  <p className="text-[10px] text-muted-foreground">{formatRelativeDate(conv.updated_at)}</p>
                </div>
                {onDeleteConversation && (
                  <button
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0 mt-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDeleteConversation(conv.id);
                    }}
                    title="Excluir conversa"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </DropdownMenuItem>
            ))}
            {conversations.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs text-muted-foreground cursor-pointer gap-1.5"
                  onSelect={onNewConversation}
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  Nova conversa
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  ) : null;

  const chatBody = (
    <div className={cn("rounded-lg border border-border/40 bg-card/40 overflow-hidden flex flex-col", alwaysOpen ? "mt-0" : "mt-2")} style={{ minHeight: alwaysOpen ? "360px" : undefined, maxHeight: alwaysOpen ? "460px" : "380px" }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {loadingMessages ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-xs">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando conversa…
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
              {/* Avatar */}
              <div className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                msg.role === "assistant" ? "bg-primary/20" : "bg-secondary"
              )}>
                {msg.role === "assistant"
                  ? <Bot className="h-3 w-3 text-primary" />
                  : <User className="h-3 w-3 text-muted-foreground" />
                }
              </div>

              {/* Bubble */}
              <div className={cn(
                "max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                msg.role === "assistant"
                  ? "bg-secondary/50 text-foreground rounded-tl-sm"
                  : "bg-primary/15 text-foreground rounded-tr-sm"
              )}>
                {msg.isStreaming && msg.content === "" ? (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Pensando…
                  </span>
                ) : (
                  <div>{renderMarkdown(msg.content)}</div>
                )}

                {/* Quick action chips */}
                {msg.quickActions && msg.quickActions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {msg.quickActions.map((action, ai) => (
                      <button
                        key={ai}
                        onClick={() => sendToAI(action.message)}
                        disabled={isLoading}
                        className="px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Task suggestions */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2 space-y-1.5 pt-2 border-t border-border/30">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Sugestões de tarefas</p>
                    {msg.suggestions.map((s, si) => {
                      const added = addedTasks.has(s.description);
                      return (
                        <button
                          key={si}
                          onClick={() => !added && handleAddSuggestion(s)}
                          disabled={added}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-all text-[11px]",
                            added
                              ? "opacity-50 cursor-default bg-secondary/30 border-border/30 text-muted-foreground"
                              : cn("hover:scale-[1.01] cursor-pointer", priorityColor[s.priority])
                          )}
                        >
                          {added
                            ? <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                            : <Plus className="h-3 w-3 shrink-0" />
                          }
                          <span className="flex-1 leading-snug">{s.description}</span>
                          <Badge variant="outline" className={cn("text-[9px] h-4 px-1 shrink-0 border-current", priorityColor[s.priority])}>
                            {s.priority === "high" ? "alta" : s.priority === "medium" ? "média" : "baixa"}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t border-border/30 flex gap-2 bg-card/60">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Dúvida sobre gravação, mix ou master…"
          className="min-h-0 h-8 text-xs resize-none py-1.5 bg-transparent border-border/40"
          rows={1}
          disabled={isLoading || loadingMessages}
        />
        <Button
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleSend}
          disabled={!input.trim() || isLoading || loadingMessages}
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );

  if (alwaysOpen) {
    return (
      <div className="flex flex-col gap-0">
        {/* Toolbar: chips + conversation controls */}
        <div className="flex items-center gap-1 mb-1.5 min-w-0">
          {/* Context chips — horizontal scroll */}
          {contextChips.length > 0 && (
            <div className="flex-1 overflow-x-auto scrollbar-none min-w-0">
              <div className="flex gap-1 w-max pr-1">
                {contextChips.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => sendToAI(chip.msg)}
                    disabled={isLoading}
                    className={cn(
                      "shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-medium transition-all whitespace-nowrap disabled:opacity-50",
                      chip.highlight
                        ? "border-amber-400/50 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20"
                        : "border-primary/25 bg-primary/8 text-primary hover:bg-primary/18 hover:border-primary/45"
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Conversation controls */}
          {conversationSelector}
        </div>
        {chatBody}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className={cn(
          "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-all border",
          open
            ? "bg-primary/10 border-primary/30 text-primary"
            : "bg-secondary/40 border-border/30 text-muted-foreground hover:border-border hover:text-foreground"
        )}>
          <Sparkles className={cn("h-3.5 w-3.5 shrink-0", open && "text-primary")} />
          <span>Assistente IA</span>
          {messages.filter(m => m.role === "assistant" && !m.quickActions).length > 0 && !open && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-1">
              {messages.filter(m => m.role === "assistant" && !m.quickActions).length}
            </Badge>
          )}
          <ChevronDown className={cn("h-3.5 w-3.5 ml-auto transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>{chatBody}</CollapsibleContent>
    </Collapsible>
  );
});
