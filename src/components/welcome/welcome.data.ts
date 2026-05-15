import {
  Clock, DollarSign, Compass, Palette, FolderKanban,
  Users, Sparkles,
  type LucideIcon,
} from "lucide-react";

type Task = { label: string; done: boolean; urgent?: boolean };
type Alert = { label: string; tone: "warning" | "info" };
type MockProject = {
  name: string;
  artist: string;
  stage: string;
  releaseDate: string;
  health: number; // 0-100
  budget: { spent: number; total: number };
  tasks: Task[];
  alerts: Alert[];
};

export const MOCK_PROJECT: MockProject = {
  name: "Noite Clara",
  artist: "Maria Silva",
  stage: "Pré-lançamento",
  releaseDate: "15 jun",
  health: 72,
  budget: { spent: 4200, total: 8000 },
  tasks: [
    { label: "Master finalizado", done: true },
    { label: "Capa entregue", done: true },
    { label: "Distribuição enviada", done: true },
    { label: "Vídeo clipe", done: false, urgent: true },
    { label: "Press release", done: false },
  ],
  alerts: [
    { label: "Nota fiscal do estúdio vence em 2 dias", tone: "warning" },
    { label: "Edital ProAC fecha sexta — você se encaixa", tone: "info" },
  ],
};

export type PainPoint = { pain: string; solve: string; icon: LucideIcon };

export const PAIN_POINTS: PainPoint[] = [
  {
    pain: "Prazo perdido porque a nota fiscal ficou no WhatsApp",
    solve: "Prazos, equipe e pagamentos num só lugar, com alertas automáticos.",
    icon: Clock,
  },
  {
    pain: "Não sabe quanto já gastou — planilha desatualizada faz 3 semanas",
    solve: "Financeiro por projeto e por faixa, atualizado em tempo real.",
    icon: DollarSign,
  },
  {
    pain: "Perdeu o edital do ProAC porque não sabia que estava aberto",
    solve: "IA monitora editais e palcos compatíveis com seu perfil.",
    icon: Compass,
  },
];

export type Module = { icon: LucideIcon; name: string; desc: string };

// 6 módulos refletindo a estrutura atual (Carreira unifica Editais + Palcos)
export const MODULES: Module[] = [
  { icon: FolderKanban, name: "Projetos",     desc: "Do rascunho ao streaming, em 6 etapas claras." },
  { icon: DollarSign,   name: "Financeiro",   desc: "Custos, recebíveis e saldo por projeto." },
  { icon: Clock,        name: "Agenda",       desc: "Shows, gravações e entregas num calendário só." },
  { icon: Users,        name: "Equipe",       desc: "Produtor, mix, fotógrafo — cada um sabe o que entregar." },
  { icon: Compass,      name: "Carreira",     desc: "Editais e palcos abertos, filtrados por IA." },
  { icon: Sparkles,     name: "DNA + Criativo", desc: "Diagnóstico de mix/master e arte gerada por IA." },
];

// keep Palette import alive for tree-shake clarity (used elsewhere? remove)
void Palette;
