import { describe, it, expect, beforeEach } from "vitest";
import { readInviteCtx, clearInviteCtx, INVITE_CTX_KEY, type InviteCtx } from "../inviteCtx";

describe("readInviteCtx", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns null when sessionStorage is empty", () => {
    expect(readInviteCtx()).toBeNull();
  });

  it("returns null when stored value is invalid JSON", () => {
    sessionStorage.setItem(INVITE_CTX_KEY, "not-json{{{");
    expect(readInviteCtx()).toBeNull();
  });

  it("returns parsed InviteCtx when valid JSON is stored", () => {
    const ctx: InviteCtx = {
      projectId: "proj-123",
      projectName: "Álbum de Verão",
      artistName: "Maria",
      role: "Mix Engineer",
    };
    sessionStorage.setItem(INVITE_CTX_KEY, JSON.stringify(ctx));
    expect(readInviteCtx()).toEqual(ctx);
  });

  it("returns partial InviteCtx when only some fields are set", () => {
    const ctx: InviteCtx = { projectId: "p1" };
    sessionStorage.setItem(INVITE_CTX_KEY, JSON.stringify(ctx));
    const result = readInviteCtx();
    expect(result?.projectId).toBe("p1");
    expect(result?.projectName).toBeUndefined();
  });
});

describe("clearInviteCtx", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("removes the key from sessionStorage", () => {
    sessionStorage.setItem(INVITE_CTX_KEY, JSON.stringify({ projectId: "p1" }));
    clearInviteCtx();
    expect(sessionStorage.getItem(INVITE_CTX_KEY)).toBeNull();
  });

  it("does not throw when key does not exist", () => {
    expect(() => clearInviteCtx()).not.toThrow();
  });

  it("after clearing, readInviteCtx returns null", () => {
    sessionStorage.setItem(INVITE_CTX_KEY, JSON.stringify({ projectId: "p1" }));
    clearInviteCtx();
    expect(readInviteCtx()).toBeNull();
  });
});
