export const INVITE_CTX_KEY = "sfp_invite_ctx";

export interface InviteCtx {
  projectId?: string;
  projectName?: string;
  artistName?: string;
  role?: string;
}

export function readInviteCtx(): InviteCtx | null {
  try {
    const stored = sessionStorage.getItem(INVITE_CTX_KEY);
    return stored ? (JSON.parse(stored) as InviteCtx) : null;
  } catch {
    return null;
  }
}

export function clearInviteCtx(): void {
  try {
    sessionStorage.removeItem(INVITE_CTX_KEY);
  } catch {}
}
