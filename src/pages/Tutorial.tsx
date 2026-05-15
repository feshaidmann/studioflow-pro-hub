import { useState } from "react";
import {
  HelpCircle,
  FolderKanban,
  DollarSign,
  CalendarDays,
  Bot,
  Lightbulb,
  CheckCircle2,
  MessageSquare,
  GraduationCap,
  Wand2,
  Sparkles,
  Activity,
  ChevronRight,
  AlertTriangle,
  Dna,
  FileText,
  Palette,
  Share2,
  Radar,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 p-3 mt-3">
      <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mt-3">
      <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
        <span className="text-xs font-bold text-primary">{n}</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">{children}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 first:mt-0">
      {children}
    </p>
  );
}

function ExampleQuery({
  icon: Icon,
  text,
  color = "text-primary",
}: {
  icon: React.ElementType;
  text: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-secondary/40 border border-border/30 px-3 py-2 mb-1.5">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", color)} />
      <span className="text-xs text-foreground italic">"{text}"</span>
    </div>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const tabs = [
  { id: "getting-started", icon: HelpCircle, label: "Primeiros passos", short: "Início" },
  { id: "projects", icon: FolderKanban, label: "Projetos", short: "Proj" },
  { id: "music-dna", icon: Dna, label: "DNA Musical", short: "DNA" },
  { id: "editais", icon: FileText, label: "Carreira", short: "Carreira" },
  { id: "creative", icon: Palette, label: "Criativo", short: "Arte" },
  { id: "finance", icon: DollarSign, label: "Finanças", short: "Fin" },
  { id: "agenda", icon: CalendarDays, label: "Agenda", short: "Agenda" },
  { id: "ai", icon: Bot, label: "Assistente IA", short: "IA" },
] as const;

type TabId = (typeof tabs)[number]["id"];

// ─── Tab contents ─────────────────────────────────────────────────────────────

const tabContent: Record<TabId, React.ReactNode> = {
  "getting-started": (
    <div className="space-y-2">
      <SectionTitle>Bem-vindo ao StudioFlow</SectionTitle>
      <p className="text-sm text-muted-foreground leading-relaxed">
        O StudioFlow organiza todo o ciclo dos seus projetos musicais — da ideia até o lançamento.
        Aqui você acompanha projetos, finanças, agenda, equipe e recebe orientação da IA, tudo em um só lugar.
      </p>

      <SectionTitle>Seu fluxo de trabalho</SectionTitle>
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-card/50 border border-border/50">
        {["Iniciado", "Gravação", "Mix", "Master", "Upload", "Lançado"].map((s, i, arr) => (
          <span key={s} className="flex items-center gap-2">
            <Badge variant={i === 0 ? "default" : "secondary"} className="text-xs">{s}</Badge>
            {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </span>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Cada projeto passa por essas 6 etapas. Você avança manualmente conforme o trabalho evolui.
      </p>

      <SectionTitle>Como usar o Dashboard</SectionTitle>
      <Step n={1}>No <strong>Dashboard</strong>, você vê seus KPIs financeiros, projetos ativos e o Checklist do Dia.</Step>
      <Step n={2}>Use o <strong>filtro de projeto</strong> no topo para focar nos números de um único projeto.</Step>
      <Step n={3}>O <strong>Checklist do Dia</strong> reúne tarefas manuais e sugestões do Assistente IA.</Step>

      <SectionTitle>Configure seu perfil</SectionTitle>
      <Step n={1}>Vá em <strong>Configurações</strong> e preencha nome artístico, bio e especialidades.</Step>
      <Step n={2}>Envie uma foto de perfil (JPG, PNG ou WebP, até 2 MB).</Step>
      <Step n={3}>Ative <strong>"Aceitar convites"</strong> para que outros artistas possam te encontrar.</Step>
      <p className="text-sm text-muted-foreground">
        Seu perfil público fica em <strong className="text-foreground">/u/seu-username</strong> e exibe bio, especialidades, projetos concluídos e avaliação.
      </p>

      <SectionTitle>Seus contatos profissionais</SectionTitle>
      <Step n={1}>Acesse <strong>Profissionais</strong> no menu para cadastrar parceiros (músicos, produtores, técnicos).</Step>
      <Step n={2}>Preencha nome, especialidade, e-mail, WhatsApp e uma bio breve.</Step>
      <Step n={3}>Após um projeto, avalie o parceiro com estrelas — isso constrói o histórico de reputação.</Step>
      <Tip>Quanto mais dados você cadastrar (projetos, parceiros, transações), mais útil será o Assistente IA.</Tip>
    </div>
  ),

  projects: (
    <div className="space-y-2">
      <SectionTitle>Como criar um projeto</SectionTitle>
      <Step n={1}>Clique em <strong>"Novo Projeto"</strong> na barra superior.</Step>
      <Step n={2}>Preencha <strong>nome, artista, BPM e tonalidade</strong>. Ex: 128 BPM em Am.</Step>
      <Step n={3}>Escolha o <strong>tipo</strong>: Single, EP, Álbum, Beat, Trilha Guia ou Feat.</Step>
      <Step n={4}>Selecione a <strong>etapa atual</strong> do projeto.</Step>

      <SectionTitle>Como gerenciar projetos</SectionTitle>
      <Step n={1}>Na lista, clique em <strong>"Detalhes"</strong> para abrir a visão completa do projeto.</Step>
      <Step n={2}>Edite BPM, Key, estágio e progresso diretamente no card.</Step>
      <Step n={3}>Quando tudo estiver pronto, marque como <strong>"Finalizado"</strong>.</Step>

      <SectionTitle>Dentro de um projeto: o que você encontra</SectionTitle>
      <p className="text-sm text-muted-foreground leading-relaxed">
        A tela de detalhe reúne tudo do projeto em abas:
      </p>
      <div className="space-y-1.5 mt-2">
        {[
          { title: "Faixas", desc: "Lista de tracks com checkbox de concluído. O KPI mostra quantas estão prontas (ex: 4/6)." },
          { title: "Equipe", desc: "Membros com papel, cachê e contato. Use \"Gerenciar equipe\" para adicionar pessoas." },
          { title: "Financeiro", desc: "Receitas, despesas e saldo exclusivos do projeto. Funciona como um mini-balanço." },
          { title: "Chat", desc: "Comunicação em tempo real entre os membros do projeto." },
          { title: "Lançamento", desc: "Checklist completo com 7 seções: Distribuição, Metadados, Jurídico, Conteúdo, Plataformas, Divulgação e Status Final." },
        ].map(({ title, desc }) => (
          <div key={title} className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground"><strong className="text-foreground">{title}</strong> — {desc}</p>
          </div>
        ))}
      </div>

      <SectionTitle>Compartilhar via WhatsApp</SectionTitle>
      <div className="flex items-start gap-2 rounded-lg bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20 p-3">
        <Share2 className="h-4 w-4 text-[hsl(var(--success))] mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Use o botão <strong className="text-foreground">"Compartilhar via WhatsApp"</strong> na visão geral e no checklist de lançamento para enviar atualizações do projeto diretamente aos seus contatos.
        </p>
      </div>

      <SectionTitle>Convites para profissionais</SectionTitle>
      <Step n={1}>Na página <strong>Profissionais</strong>, localize o parceiro e clique em <strong>"Convidar"</strong>.</Step>
      <Step n={2}>Defina função, cachê e prazo. Um link de convite será gerado.</Step>
      <Step n={3}>Quando o profissional responder, o status atualiza automaticamente.</Step>
      <Tip>Use a aba Financeiro do projeto para calcular o ROI antes de aceitar novos projetos similares.</Tip>
    </div>
  ),

  "music-dna": (
    <div className="space-y-2">
      <SectionTitle>O que é o DNA Musical?</SectionTitle>
      <p className="text-sm text-muted-foreground leading-relaxed">
        O DNA Musical analisa seu áudio diretamente no navegador, extrai métricas técnicas reais e gera um laudo completo com IA — tudo sem sair da plataforma.
      </p>

      <SectionTitle>O que é analisado</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        {[
          { title: "Loudness", desc: "LUFS integrado, LUFS short-term, True Peak e Dynamic Range" },
          { title: "Rítmica e harmonia", desc: "BPM, tonalidade, duração" },
          { title: "Espectro", desc: "Centroide espectral (brilho), Rolloff, Flatness" },
          { title: "Perfil acústico", desc: "Energia, dançabilidade, valência, instrumentalidade e mais" },
          { title: "Impressão acústica", desc: "MFCC (13 coeficientes) e Chroma CENS (12 classes) — usados no Match Acústico Local" },
          { title: "Segmentação", desc: "Intro, verso, refrão, bridge, outro — com métricas por seção" },
          { title: "Contraste", desc: "Ganho de RMS, energia e brilho entre verso e refrão" },
        ].map(({ title, desc }) => (
          <div key={title} className="flex items-start gap-3 rounded-lg bg-card/50 border border-border/50 p-3">
            <div className="h-6 w-6 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>Como usar</SectionTitle>
      <Step n={1}>Acesse <strong>DNA Musical</strong> no menu lateral.</Step>
      <Step n={2}>Dê um <strong>nome para a faixa</strong> e, opcionalmente, adicione notas e artistas de referência.</Step>
      <Step n={3}>Faça o <strong>upload do áudio</strong> (.mp3, .wav, .flac, .m4a, .ogg, .aiff ou .aif).</Step>
      <Step n={4}>Clique em <strong>"Analisar"</strong> e acompanhe o progresso em tempo real.</Step>

      <SectionTitle>O que você recebe</SectionTitle>
      <div className="space-y-1.5">
        {[
          "Identidade sonora e território do gênero declarado",
          "Identidade musical: mood, território sonoro e persona do ouvinte",
          "Diagnóstico técnico de LUFS, True Peak, DR e espectro",
          "Análise de seções e contraste verso→refrão",
          "3 artistas similares com % de proximidade",
          "Pontos fortes, gargalos e sugestões de arranjo",
          "Próximos passos priorizados com ação e impacto",
          "Gráfico de radar e timeline visual das seções",
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{item}</p>
          </div>
        ))}
      </div>

      <SectionTitle>Match Acústico Local (MFCC + Chroma)</SectionTitle>
      <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 p-3">
        <Radar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Após a análise, o painel <strong className="text-foreground">"Match Acústico"</strong> compara a impressão sonora da sua faixa (MFCC + Chroma + métricas físicas e perceptuais) contra um catálogo de referência — direto no seu navegador, em um Web Worker. Mostra os <strong className="text-foreground">artistas, gêneros e faixas mais próximas</strong> com % de similaridade.
        </p>
      </div>
      <div className="flex items-start gap-2 rounded-lg bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20 p-3 mt-2">
        <ShieldCheck className="h-4 w-4 text-[hsl(var(--success))] mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          O cálculo é <strong className="text-foreground">100% local</strong>: nenhuma faixa é enviada a APIs externas. O catálogo é baixado uma vez por sessão e reutilizado em cache.
        </p>
      </div>

      <SectionTitle>Snapshot do catálogo (admin)</SectionTitle>
      <Step n={1}>Acesse <strong>/admin/reference-tracks</strong> (apenas perfis admin).</Step>
      <Step n={2}>No card <strong>"Snapshot acústico"</strong>, clique em <strong>"Gerar snapshot"</strong> para empacotar todas as faixas de referência (com MFCC + Chroma) em um único JSON público.</Step>
      <Step n={3}>O snapshot é versionado em <code className="text-xs">acoustic-catalog/v1.json</code> e alimenta o Match Acústico de todos os usuários.</Step>
      <Tip>Regere o snapshot sempre que importar novas referências em massa via <code className="text-xs">import-reference-tracks</code>.</Tip>

      <SectionTitle>Integração com o Módulo Criativo</SectionTitle>
      <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 p-3">
        <Palette className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Após a análise, use o botão <strong className="text-foreground">"Criar arte com este DNA"</strong> para gerar automaticamente uma arte visual baseada no mood, gênero e identidade da faixa.
        </p>
      </div>

      <SectionTitle>Feedback e calibração</SectionTitle>
      <Step n={1}>Após o resultado, clique em <strong>"Dar Feedback"</strong> para corrigir gênero ou atributos.</Step>
      <Step n={2}>Sua correção retroalimenta o modelo para diagnósticos mais precisos.</Step>

      <Tip>Envie de preferência .wav sem compressão para o diagnóstico mais preciso.</Tip>
      <Warn>Arquivos com menos de 30 segundos podem não ter seções suficientes para segmentação completa.</Warn>
    </div>
  ),

  editais: (
    <div className="space-y-2">
      <SectionTitle>Carreira: editais e palcos no mesmo lugar</SectionTitle>
      <p className="text-sm text-muted-foreground leading-relaxed">
        O módulo <strong>Carreira</strong> reúne todas as oportunidades para crescer artisticamente:
        editais de fomento (leis de incentivo, bolsas, prêmios) e palcos (festivais, showcases,
        residências, aberturas). Tudo numa lista única, com filtro lateral por tipo.
      </p>

      <SectionTitle>Filtros laterais</SectionTitle>
      <Step n={1}>Acesse <strong>Carreira</strong> no menu.</Step>
      <Step n={2}>Use o filtro <strong>Tipo</strong> para ver só editais, só palcos, ou ambos.</Step>
      <Step n={3}>Combine com filtros de <strong>status</strong> (Aberto, Previsto…) e <strong>estado</strong> (UF).</Step>

      <SectionTitle>Busca inteligente unificada</SectionTitle>
      <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 p-3">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Descreva o que procura em linguagem natural (ex: <em>"festivais de MPB no Sul"</em> ou <em>"bolsas de produção musical"</em>).
          A IA detecta a intenção, dispara as buscas certas e mistura os resultados num único feed.
        </p>
      </div>

      <SectionTitle>Candidatura e acompanhamento</SectionTitle>
      <Step n={1}>Clique em <strong>Candidatar</strong> num edital para iniciar uma inscrição.</Step>
      <Step n={2}>Acompanhe tudo na aba <strong>Minhas inscrições</strong>: status, prazos e checklist de documentos.</Step>
      <Step n={3}>Use o auto-preenchimento com base no seu perfil cultural para acelerar formulários.</Step>

      <Tip>Quanto mais completo seu perfil (bio, especialidades, cidade), mais preciso será o match com editais e palcos.</Tip>
    </div>
  ),

  creative: (
    <div className="space-y-2">
      <SectionTitle>Módulo Criativo</SectionTitle>
      <p className="text-sm text-muted-foreground leading-relaxed">
        O Módulo Criativo permite gerar artes visuais, capas, banners e legendas para redes sociais usando IA generativa — tudo integrado aos seus projetos.
      </p>

      <SectionTitle>Como gerar uma arte</SectionTitle>
      <Step n={1}>Acesse <strong>Criativo</strong> no menu lateral.</Step>
      <Step n={2}>Escreva um <strong>prompt</strong> descrevendo a arte que deseja (ex: "capa de single de trap com tons escuros e tipografia bold").</Step>
      <Step n={3}>Escolha o <strong>formato</strong>: Capa (1:1), Stories (9:16), Banner (16:9), Post (4:5) ou YouTube.</Step>
      <Step n={4}>Opcionalmente, selecione um <strong>estilo visual</strong> (Minimalista, Neon, Vintage, Aquarela, etc.).</Step>
      <Step n={5}>Clique em <strong>"Gerar"</strong> e aguarde a IA criar sua arte.</Step>

      <SectionTitle>Recursos avançados</SectionTitle>
      <div className="space-y-1.5">
        {[
          "Geração em lote (múltiplos formatos de uma vez)",
          "Imagem de referência para guiar o estilo",
          "Templates rápidos (Capa de Single, Post de Lançamento, Stories, etc.)",
          "Galeria com todas as artes geradas, organizadas por projeto",
          "Download direto para uso em distribuidoras e redes sociais",
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{item}</p>
          </div>
        ))}
      </div>

      <SectionTitle>Integração com DNA Musical</SectionTitle>
      <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 p-3">
        <Dna className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Ao analisar uma faixa no <strong className="text-foreground">DNA Musical</strong>, você pode gerar automaticamente uma arte visual baseada no gênero, mood e identidade sonora da música.
        </p>
      </div>

      <Tip>Use os templates rápidos para gerar material de divulgação completo em poucos cliques: capa + stories + post.</Tip>
    </div>
  ),

  finance: (
    <div className="space-y-2">
      <SectionTitle>Como registrar transações</SectionTitle>
      <Step n={1}>Clique em <strong>"Nova Transação"</strong> e escolha: <strong>Receita</strong> ou <strong>Despesa</strong>.</Step>
      <Step n={2}>Vincule a um <strong>projeto</strong> para calcular o saldo por projeto.</Step>
      <Step n={3}>Escolha uma <strong>categoria</strong> do universo musical.</Step>
      <Step n={4}>Marque se o pagamento já foi <strong>efetuado</strong> ou está pendente.</Step>

      <SectionTitle>Categorias de receita</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {["Venda Música/Beat", "Shows e Apresentações", "Streaming", "ECAD / Direitos Autorais", "Licenciamento", "Sync / Trilha", "Royalties", "Aulas / Workshops", "Outros"].map((c) => (
          <Badge key={c} variant="secondary" className="text-xs font-normal">{c}</Badge>
        ))}
      </div>

      <SectionTitle>Categorias de despesa</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {["Músicos e Session", "Estúdio e Gravação", "Mix e Master", "Plugins e Software", "Equipamentos", "Marketing Digital", "Distribuição Digital", "Transporte e Logística", "Outros"].map((c) => (
          <Badge key={c} variant="outline" className="text-xs font-normal">{c}</Badge>
        ))}
      </div>

      <SectionTitle>Visão por projeto</SectionTitle>
      <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 p-3">
        <FolderKanban className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Na <strong className="text-foreground">tela de Detalhe do Projeto</strong>, a aba Financeiro mostra receitas, despesas e saldo exclusivos daquele projeto.
        </p>
      </div>
      <Tip>Use a categoria "Outros" para despesas fora da lista — um campo de texto adicional aparece automaticamente.</Tip>
    </div>
  ),

  agenda: (
    <div className="space-y-2">
      <SectionTitle>Como criar eventos</SectionTitle>
      <Step n={1}>Clique em <strong>"Novo Evento"</strong> e preencha título, tipo, data e hora.</Step>
      <Step n={2}>Vincule o evento a um <strong>projeto</strong> para organização contextual.</Step>
      <Step n={3}>Adicione <strong>localização</strong> e descrição.</Step>

      <SectionTitle>Detecção de conflito de horário</SectionTitle>
      <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
        <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Ao criar um evento, o sistema verifica sobreposição de horário automaticamente. Um aviso aparece listando os conflitos — você pode <strong className="text-foreground">salvar mesmo assim</strong> ou ajustar.
        </p>
      </div>

      <SectionTitle>Tipos de evento</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {[
          { type: "Show / Apresentação", color: "border-l-[hsl(var(--success))]", desc: "Registre receita após o evento" },
          { type: "Sessão de Gravação", color: "border-l-sky-400", desc: "Vinculada a projetos em andamento" },
          { type: "Ensaio", color: "border-l-primary", desc: "Preparação para shows" },
          { type: "Reunião", color: "border-l-amber-400", desc: "Produtores, selos, empresários" },
          { type: "Prazo de Entrega", color: "border-l-destructive", desc: "Prazos críticos do projeto" },
          { type: "Outros", color: "border-l-muted-foreground", desc: "Qualquer compromisso" },
        ].map(({ type, color, desc }) => (
          <div key={type} className={cn("rounded-md bg-card/50 border border-border/40 border-l-2 px-3 py-2", color)}>
            <p className="text-sm font-medium">{type}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
      <Tip>Sempre defina horário de início <em>e</em> de fim para que a detecção de conflito funcione corretamente.</Tip>
    </div>
  ),

  ai: (
    <div className="space-y-2">
      <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 p-3 mb-2">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-foreground font-medium">
          O Assistente IA acessa seus projetos, parceiros, tarefas e finanças em tempo real. Ele é mentor técnico <em>e</em> analista dos seus dados.
        </p>
      </div>

      <SectionTitle>Pergunte sobre parceiros e equipe</SectionTitle>
      {["Quem da minha agenda pode fazer mix?", "Tem alguém disponível para masterização?", "Quais parceiros têm nota acima de 4 estrelas?"].map((q) => (
        <ExampleQuery key={q} icon={MessageSquare} text={q} />
      ))}

      <SectionTitle>Pergunte sobre projetos</SectionTitle>
      {["Quais projetos estão atrasados?", "O que preciso fazer hoje nos meus projetos?", "Me ajude a priorizar minhas tarefas desta semana"].map((q) => (
        <ExampleQuery key={q} icon={FolderKanban} text={q} />
      ))}

      <SectionTitle>Pergunte sobre finanças</SectionTitle>
      {["Como estão minhas finanças esse mês?", "Qual projeto tem o melhor ROI?", "Quanto gastei com músicos nos últimos projetos?"].map((q) => (
        <ExampleQuery key={q} icon={DollarSign} text={q} />
      ))}

      <SectionTitle>Dúvida técnica (produção e áudio)</SectionTitle>
      <div className="flex items-start gap-2 rounded-lg bg-violet-500/10 border border-violet-500/20 p-3 mb-2">
        <Wand2 className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          No Dashboard, clique no chip <strong className="text-foreground">"🎛️ Dúvida técnica"</strong> para abrir o assistente no modo engenheiro de áudio — ideal para perguntas sobre mix, master, EQ e produção.
        </p>
      </div>
      {["Como ajusto o ganho de uma faixa vocal?", "Qual a diferença entre compressão paralela e serial?", "O que é LUFS e qual o alvo para streaming?"].map((q) => (
        <ExampleQuery key={q} icon={GraduationCap} text={q} color="text-amber-400" />
      ))}

      <SectionTitle>Pergunte sobre a jornada do artista</SectionTitle>
      {["Como montar um contrato de licença de beat?", "Como precificar serviços de mixagem?", "Me explique o registro no ECAD"].map((q) => (
        <ExampleQuery key={q} icon={GraduationCap} text={q} color="text-[hsl(var(--success))]" />
      ))}

      <SectionTitle>IA contextual em cada módulo</SectionTitle>
      <div className="space-y-1.5">
        {[
          "Dentro de um projeto: IA analisa estágio, tarefas, equipe e finanças daquele projeto",
          "Em Editais: IA ajuda a redigir justificativas e entender requisitos do edital",
          "No DNA Musical: IA gera diagnóstico técnico e artístico da faixa",
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <Bot className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{item}</p>
          </div>
        ))}
      </div>

      <SectionTitle>Histórico de conversas</SectionTitle>
      <Step n={1}>Cada sessão é salva automaticamente.</Step>
      <Step n={2}>Use o dropdown <strong>"Histórico"</strong> no topo do chat para retomar conversas anteriores.</Step>
      <Step n={3}>Clique em <strong>"+ Nova"</strong> para iniciar um contexto limpo.</Step>
      <Tip>Quanto mais dados você cadastrar, mais precisa será a resposta da IA.</Tip>
    </div>
  ),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Tutorial() {
  const [activeTab, setActiveTab] = useState<TabId>("getting-started");

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <header className="animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <HelpCircle className="h-7 w-7 text-primary" />
          Guia de Uso
        </h1>
        <p className="text-muted-foreground mt-1">
          Aprenda a usar cada funcionalidade do StudioFlow em poucos passos.
        </p>
      </header>

      <div className="flex gap-1.5 overflow-x-auto pb-1 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0",
              activeTab === tab.id
                ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent"
            )}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.short}</span>
          </button>
        ))}
      </div>

      <Card className="glass-card animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <CardContent className="p-4 md:p-6">
          {tabContent[activeTab]}
        </CardContent>
      </Card>
    </div>
  );
}
