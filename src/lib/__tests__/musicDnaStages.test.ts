import { describe, it, expect } from "vitest";
import {
  workflowStageToAudioStage,
  resolveStage,
  parseStage,
  STAGE_PROFILES,
  STAGE_LABEL,
  STAGE_DESCRIPTION,
} from "../musicDnaStages";

describe("workflowStageToAudioStage", () => {
  it("maps 'inicio' to 'demo'", () => {
    expect(workflowStageToAudioStage("inicio")).toBe("demo");
  });

  it("maps 'rough' to 'demo'", () => {
    expect(workflowStageToAudioStage("rough")).toBe("demo");
  });

  it("maps 'gravacao' to 'demo'", () => {
    expect(workflowStageToAudioStage("gravacao")).toBe("demo");
  });

  it("maps 'mix' to 'mix'", () => {
    expect(workflowStageToAudioStage("mix")).toBe("mix");
  });

  it("maps 'master' to 'master'", () => {
    expect(workflowStageToAudioStage("master")).toBe("master");
  });

  it("maps 'upload' to 'master'", () => {
    expect(workflowStageToAudioStage("upload")).toBe("master");
  });

  it("maps 'lancado' to 'master'", () => {
    expect(workflowStageToAudioStage("lancado")).toBe("master");
  });

  it("returns null for unknown stage", () => {
    expect(workflowStageToAudioStage("unknown")).toBeNull();
    expect(workflowStageToAudioStage("")).toBeNull();
    expect(workflowStageToAudioStage(null)).toBeNull();
    expect(workflowStageToAudioStage(undefined)).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(workflowStageToAudioStage("MIX")).toBe("mix");
    expect(workflowStageToAudioStage("Master")).toBe("master");
    expect(workflowStageToAudioStage("INICIO")).toBe("demo");
  });

  it("trims whitespace before matching", () => {
    expect(workflowStageToAudioStage("  mix  ")).toBe("mix");
  });
});

describe("resolveStage", () => {
  it("returns the override when provided", () => {
    expect(resolveStage("demo", "mix")).toBe("demo");
    expect(resolveStage("mix", "master")).toBe("mix");
  });

  it("falls back to workflow stage when override is null/undefined", () => {
    expect(resolveStage(null, "mix")).toBe("mix");
    expect(resolveStage(undefined, "gravacao")).toBe("demo");
  });

  it("falls back to 'master' when both override and workflow stage are absent", () => {
    expect(resolveStage(null, null)).toBe("master");
    expect(resolveStage(undefined, undefined)).toBe("master");
    expect(resolveStage(null, "unknown-stage")).toBe("master");
  });
});

describe("parseStage", () => {
  it("returns 'demo' for the string 'demo'", () => {
    expect(parseStage("demo")).toBe("demo");
  });

  it("returns 'mix' for the string 'mix'", () => {
    expect(parseStage("mix")).toBe("mix");
  });

  it("returns 'master' for the string 'master'", () => {
    expect(parseStage("master")).toBe("master");
  });

  it("returns null for anything else", () => {
    expect(parseStage("rough")).toBeNull();
    expect(parseStage("inicio")).toBeNull();
    expect(parseStage(null)).toBeNull();
    expect(parseStage(undefined)).toBeNull();
    expect(parseStage(42)).toBeNull();
    expect(parseStage({})).toBeNull();
  });
});

describe("STAGE_PROFILES", () => {
  it("exists for all three stages", () => {
    expect(STAGE_PROFILES).toHaveProperty("demo");
    expect(STAGE_PROFILES).toHaveProperty("mix");
    expect(STAGE_PROFILES).toHaveProperty("master");
  });

  it("demo stage hides the streaming-ready badge", () => {
    expect(STAGE_PROFILES.demo.readyBadge).toBe("hidden");
  });

  it("master stage shows the streaming-ready badge", () => {
    expect(STAGE_PROFILES.master.readyBadge).toBe("streaming");
  });

  it("master enforces LUFS, demo does not", () => {
    expect(STAGE_PROFILES.master.enforceLufs).toBe(true);
    expect(STAGE_PROFILES.demo.enforceLufs).toBe(false);
  });

  it("only master shows playlist match card", () => {
    expect(STAGE_PROFILES.master.showPlaylistMatch).toBe(true);
    expect(STAGE_PROFILES.demo.showPlaylistMatch).toBe(false);
    expect(STAGE_PROFILES.mix.showPlaylistMatch).toBe(false);
  });
});

describe("STAGE_LABEL / STAGE_DESCRIPTION", () => {
  it("has labels for all stages", () => {
    expect(STAGE_LABEL.demo).toBeTruthy();
    expect(STAGE_LABEL.mix).toBeTruthy();
    expect(STAGE_LABEL.master).toBeTruthy();
  });

  it("has descriptions for all stages", () => {
    expect(STAGE_DESCRIPTION.demo).toBeTruthy();
    expect(STAGE_DESCRIPTION.mix).toBeTruthy();
    expect(STAGE_DESCRIPTION.master).toBeTruthy();
  });
});
