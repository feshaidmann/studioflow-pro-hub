import {
  Clock, DollarSign, FileText, Palette, FolderKanban,
  Users, Mic2, Sparkles,
  type LucideIcon,
} from "lucide-react";

type Task = { label: string; done: boolean; urgent?: boolean };
type MockProject = {
  name: string;
  artist: string;
  stage: string;
  releaseDate: string;
  budget: { spent: number; total: number };
  tasks: Task[];
};

export const MOCK_PROJECT: MockProject = {
  name: "Noite Clara",
  artist: "Maria Silva",
  stage: "Pré-lançamento",
  releaseDate: "15 jun",
  budget: { spent: 4200, total: 8000 },
  tasks: [
    { label: "Master finalizado", done: true },
    { label: "Capa entregue", done: true },
    { label: "Distribuição enviada", done: true },
    { label: "Press release", done: false, urgent: false },
    { label: "Publicidade paga", done: false, urgent: false },
    { label: "Vídeo clipe", done: false, urgent: true },
    { label: "Notas fiscais equipe", done: false, urgent: true },
  ],
};

export type PainPoint = { pain: string; solve: string; icon: LucideIcon };

export const PAIN_POINTS: PainPoint[] = [
  {
    pain: "Prazo de entrega perdido porque a nota fiscal do estúdio ficou no WhatsApp",
    solve: "Prazos, equipe e pagamentos num só lugar. Com alertas automáticos.",
    icon: Clock,
  },
  {
    pain: "Sem saber quanto já gastou no álbum — planilha desatualizada faz 3 semanas",
    solve: "Financeiro por projeto e por faixa. Atualiza em tempo real.",
    icon: DollarSign,
  },
  {
    pain: "Perdeu o edital do ProAC porque não sabia que estava aberto",
    solve: "IA encontra e monitora editais de fomento abertos para você.",
    icon: FileText,
  },
  {
    pain: "Capa do single feita em Canva de graça — não combina com a música",
    solve: "Arte gerada com IA a partir do DNA sonoro da faixa.",
    icon: Palette,
  },
];

export type Module = { icon: LucideIcon; name: string; desc: string };

export const MODULES: Module[] = [
  { icon: FolderKanban, name: "Projetos",     desc: "Do rascunho ao streaming — checklist completo de lançamento." },
  { icon: DollarSign,   name: "Financeiro",   desc: "Quanto custou, o que falta pagar, quanto entrou de cachê." },
  { icon: Clock,        name: "Agenda",       desc: "Gravações, reuniões, shows e entregas num calendário só." },
  { icon: Users,        name: "Equipe",       desc: "Produtor, mixador, fotógrafo — cada um sabe o que entregar." },
  { icon: FileText,     name: "Editais",      desc: "ProAC, Funarte, SESC — IA encontra oportunidades abertas." },
  { icon: Mic2,         name: "Palcos",       desc: "Festivais e showcases compatíveis com seu perfil e gênero." },
  { icon: Palette,      name: "Criativo",     desc: "Capa, post e legenda gerados com IA a partir do DNA da faixa." },
  { icon: Sparkles,     name: "DNA Musical",  desc: "Diagnóstico técnico de mix e master em segundos." },
];
