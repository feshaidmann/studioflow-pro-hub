

## Diagnóstico

Atualmente **não existe** um player de áudio inline no projeto. Todos os arquivos (inclusive áudio) exibem apenas um botão de download. Para implementar a proteção que você descreve, precisamos:

1. **Criar um player de áudio inline** — para que membros/colaboradores possam ouvir sem baixar
2. **Restringir o download** apenas ao dono do projeto (quem criou o projeto, `projects.user_id`)
3. **Proteger no backend** — as signed URLs para download devem ser geradas apenas para o owner

---

## Plano

### 1. Criar componente `AudioPlayer`
- Componente reutilizável que recebe uma signed URL e renderiza um `<audio>` nativo com controles (play, pause, seek, volume)
- A URL será gerada com tempo curto (ex: 5 min) e sem header de download forçado
- Aplicado automaticamente quando o `mime_type` começa com `audio/`

### 2. Diferenciar "ouvir" de "baixar" na UI

**ProjectFilesTab (owner):** mantém player + botão de download (owner sempre pode baixar)

**CollaboratorFilesTab e ProjectChat:** exibe o player inline para áudio, mas **remove o botão de download** para todos exceto o dono do projeto

- Nos componentes `ProjectChat`, `CollaboratorFilesTab` e `ProjectFilesTab`, verificar se o usuário atual é o `projects.user_id`
- Se não for o owner: esconder ícone de Download, mostrar apenas o player
- Se for o owner: mostrar ambos

### 3. Proteção backend (signed URLs)
- Criar uma função RPC `get_file_download_url(p_file_id uuid)` com `SECURITY DEFINER` que:
  - Verifica se `auth.uid()` é o `projects.user_id` do projeto vinculado ao arquivo
  - Só gera a signed URL de download se for o owner
  - Retorna erro se não for autorizado
- Para **playback** (streaming): manter a signed URL curta existente (via `createSignedUrl` no cliente), já que o bucket é privado e a URL expira — o áudio toca mas não é facilmente salvável

### 4. Detalhes técnicos

**Novo componente:** `src/components/ui/audio-player.tsx`
```
<audio controls controlsList="nodownload" src={signedUrl} />
```
- O atributo `controlsList="nodownload"` remove o botão de download nativo do player do navegador

**Arquivos editados:**
- `src/components/project-hub/ProjectFilesTab.tsx` — adicionar player inline para arquivos de áudio; passar prop `isOwner`
- `src/components/project-hub/CollaboratorFilesTab.tsx` — adicionar player, remover botão de download
- `src/components/project-hub/ProjectChat.tsx` — player inline para anexos de áudio, download condicional
- `src/pages/ProjectDetail.tsx` — passar `isOwner` para os componentes de arquivos
- `src/hooks/useProjectFiles.ts` — adicionar função `getPlaybackUrl` com URL de 5min

**Nova migration SQL:**
- Função RPC `get_file_download_url` que valida ownership antes de gerar URL

### Limitação importante
A proteção é "best effort" no frontend — um usuário técnico poderia inspecionar o código e pegar a URL de streaming. Para proteção total seria necessário um proxy de streaming server-side, mas o player com `controlsList="nodownload"` + URLs curtas + sem botão de download oferece uma barreira prática sólida para o contexto da plataforma.

