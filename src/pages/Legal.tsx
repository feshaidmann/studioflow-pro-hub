import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TERMS_CONTENT = `
Última atualização: 30 de março de 2026

## 1. Aceitação dos Termos
Ao acessar e usar o MusicOS.ai, você concorda com estes Termos de Uso. Se não concordar, não utilize a plataforma.

## 2. Descrição do Serviço
O MusicOS.ai é uma plataforma de gestão para produtores musicais e artistas, oferecendo ferramentas de organização de projetos, controle financeiro, agenda e networking profissional.

## 3. Conta do Usuário
- Você é responsável por manter a confidencialidade da sua conta.
- Deve fornecer informações precisas e atualizadas.
- Não é permitido compartilhar credenciais de acesso.

## 4. Uso Aceitável
Você concorda em não utilizar a plataforma para:
- Atividades ilegais ou não autorizadas.
- Envio de spam ou conteúdo ofensivo.
- Tentativas de comprometer a segurança do sistema.

## 5. Propriedade Intelectual
Todo o conteúdo da plataforma (design, código, textos) é de propriedade do MusicOS.ai. O conteúdo que você cria (projetos, dados) permanece seu.

## 6. Limitação de Responsabilidade
A plataforma é fornecida "como está". Não garantimos disponibilidade ininterrupta ou ausência de erros. Estamos em fase beta e melhorias contínuas estão sendo implementadas.

## 7. Modificações
Reservamos o direito de modificar estes termos a qualquer momento. Mudanças significativas serão comunicadas por e-mail ou notificação na plataforma.

## 8. Contato
Para dúvidas sobre estes termos, utilize o botão de feedback dentro da plataforma.
`;

const PRIVACY_CONTENT = `
Última atualização: 30 de março de 2026

## 1. Dados Coletados
Coletamos apenas os dados necessários para o funcionamento da plataforma:
- **Dados de cadastro**: nome, e-mail, cidade, especialidades profissionais.
- **Dados de uso**: projetos, transações, eventos e contatos que você cria.
- **Dados técnicos**: logs de acesso e informações do dispositivo para segurança.

## 2. Como Usamos seus Dados
- Para fornecer e melhorar os serviços da plataforma.
- Para personalizar sua experiência.
- Para enviar notificações relevantes sobre seus projetos.
- Para análises internas e melhoria do produto.

## 3. Compartilhamento
- **Não vendemos** seus dados pessoais a terceiros.
- Dados do seu perfil público (quando ativado por você) ficam visíveis para outros usuários da plataforma.
- Podemos compartilhar dados agregados e anônimos para fins analíticos.

## 4. Armazenamento e Segurança
- Seus dados são armazenados de forma segura em servidores protegidos.
- Utilizamos criptografia para proteger informações sensíveis.
- Implementamos políticas de acesso restrito aos dados.

## 5. Seus Direitos
Você pode, a qualquer momento:
- Acessar seus dados pessoais.
- Corrigir informações incorretas.
- Solicitar a exclusão da sua conta e dados.
- Exportar seus dados.

## 6. Cookies
Utilizamos cookies essenciais para autenticação e funcionamento da plataforma. Não utilizamos cookies de rastreamento publicitário.

## 7. Alterações
Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças significativas.

## 8. Contato
Para questões relacionadas à privacidade, utilize o botão de feedback dentro da plataforma.
`;

export default function Legal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "terms";
  const isTerms = tab === "terms";

  const content = isTerms ? TERMS_CONTENT : PRIVACY_CONTENT;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" className="text-muted-foreground gap-2 mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <div className="flex gap-2 mb-8">
          <Button
            variant={isTerms ? "default" : "outline"}
            size="sm"
            onClick={() => navigate("/legal?tab=terms", { replace: true })}
          >
            Termos de Uso
          </Button>
          <Button
            variant={!isTerms ? "default" : "outline"}
            size="sm"
            onClick={() => navigate("/legal?tab=privacy", { replace: true })}
          >
            Política de Privacidade
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-6">
          {isTerms ? "Termos de Uso" : "Política de Privacidade"}
        </h1>

        <div className="prose prose-sm max-w-none">
          {content.split("\n").map((line, i) => {
            if (line.startsWith("## ")) {
              return <h2 key={i} className="text-lg font-semibold mt-6 mb-2 text-foreground">{line.replace("## ", "")}</h2>;
            }
            if (line.startsWith("- **")) {
              const match = line.match(/- \*\*(.+?)\*\*:?\s*(.*)/);
              if (match) {
                return (
                  <p key={i} className="text-sm text-muted-foreground ml-4 mb-1">
                    • <strong className="text-foreground">{match[1]}</strong>{match[2] ? `: ${match[2]}` : ""}
                  </p>
                );
              }
            }
            if (line.startsWith("- ")) {
              return <p key={i} className="text-sm text-muted-foreground ml-4 mb-1">• {line.replace("- ", "")}</p>;
            }
            if (line.trim()) {
              return <p key={i} className="text-sm text-muted-foreground mb-2">{line}</p>;
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}
