
Objetivo

- Fazer o upload voltar a funcionar de forma confiável no chat e na aba de arquivos do projeto.

O que já ficou claro

- A captura enviada confirma falha no fluxo do chat: o toast “Erro no upload do arquivo” vem de `src/components/project-hub/ProjectChat.tsx`, antes mesmo de gravar a mensagem.
- Hoje existem 3 fluxos de upload diferentes:
  - chat: `projectId/<uuid>.<ext>`
  - arquivos do projeto: `projectId/<folder>/<filename>`
  - arquivos do colaborador: `projectId/entregas/<filename>`
- As regras do bucket dependem do primeiro segmento do path ser o UUID do projeto. Em teoria isso deveria funcionar, então a hipótese mais provável é:
  - bloqueio ainda nas policies do storage, ou
  - conflito entre policies antigas/novas, ou
  - erro real do backend está sendo mascarado pelo frontend genérico.

Plano de correção

1. Expor o erro real no frontend
   - Trocar os toasts genéricos por mensagens com `error.message` e registrar o path enviado.
   - Fazer isso nos 3 pontos de upload: chat, arquivos do projeto e arquivos do colaborador.

2. Confirmar a rejeição no backend
   - Verificar os logs recentes de storage/Postgres para descobrir a causa exata: RLS, cast de UUID, auth ou policy conflitante.

3. Padronizar os paths de upload
   - Unificar os formatos para reduzir ambiguidade, por exemplo:
```text
projectId/chat/<uuid>.<ext>
projectId/files/<folder>/<filename>
projectId/files/entregas/<filename>
```

4. Reescrever as policies do bucket `project-files`
   - Ajustar insert/select/delete para:
     - dono do projeto
     - membro do projeto
     - colaborador convidado aceito
   - Remover sobreposição de regras legadas, se existir.

5. Validar o segundo passo do fluxo
   - Após o upload no storage, conferir que os inserts em `project_messages` e `project_files` continuam autorizados para os mesmos perfis.

6. Retestar ponta a ponta
   - Chat com anexo
   - Aba “Arquivos” do projeto
   - Aba “Meus Arquivos” do colaborador
   - Download do arquivo enviado

Detalhes técnicos

- Arquivos principais:
  - `src/components/project-hub/ProjectChat.tsx`
  - `src/hooks/useProjectFiles.ts`
  - `src/components/project-hub/CollaboratorFilesTab.tsx`
- Backend:
  - nova migration para consolidar as policies de `storage.objects` e, se necessário, `project_files`
- Ajustes de UX junto da correção:
  - mostrar motivo real da falha
  - limpar input apenas em sucesso
  - alinhar limites de tamanho entre chat e arquivos
