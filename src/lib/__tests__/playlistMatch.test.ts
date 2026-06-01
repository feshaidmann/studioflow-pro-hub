import { describe, it, expect } from "vitest";
import { matchPlaylists, type PlaylistProfile, type PlaylistFeatureVector } from "../playlistMatch";

function makeProfile(id: string, vector: PlaylistFeatureVector): PlaylistProfile {
  return {
    id,
    slug: id,
    name: id,
    description: "",
    vector,
    feature_ranges: {},
    sample_tracks: [],
    size: 100,
  };
}

const profiles: PlaylistProfile[] = [
  makeProfile("electronic", {
    lufs_integrated: -8,
    dynamic_range_db: 6,
    spectral_centroid: 3500,
    tempo_bpm: 128,
    energy: 0.85,
    danceability: 0.88,
    valence: 0.6,
    acousticness: 0.05,
  }),
  makeProfile("acoustic", {
    lufs_integrated: -14,
    dynamic_range_db: 14,
    spectral_centroid: 1800,
    tempo_bpm: 80,
    energy: 0.30,
    danceability: 0.45,
    valence: 0.55,
    acousticness: 0.80,
  }),
  makeProfile("hiphop", {
    lufs_integrated: -9,
    dynamic_range_db: 8,
    spectral_centroid: 2200,
    tempo_bpm: 90,
    energy: 0.70,
    danceability: 0.80,
    valence: 0.45,
    acousticness: 0.15,
  }),
];

describe("matchPlaylists", () => {
  it("returns empty array for empty profiles", () => {
    const result = matchPlaylists({ energy: 0.8 }, []);
    expect(result).toEqual([]);
  });

  it("returns at most topN results", () => {
    const result = matchPlaylists({ energy: 0.5 }, profiles, 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("returns all profiles when topN >= profiles.length", () => {
    const result = matchPlaylists({ energy: 0.5 }, profiles, 10);
    expect(result.length).toBe(profiles.length);
  });

  it("results are sorted ascending by distance", () => {
    const user: PlaylistFeatureVector = { energy: 0.85, danceability: 0.88, tempo_bpm: 128 };
    const result = matchPlaylists(user, profiles);
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].distance).toBeLessThanOrEqual(result[i + 1].distance);
    }
  });

  it("best match for electronic-like features is 'electronic'", () => {
    const user: PlaylistFeatureVector = {
      lufs_integrated: -8,
      tempo_bpm: 128,
      energy: 0.85,
      danceability: 0.88,
      acousticness: 0.05,
    };
    const result = matchPlaylists(user, profiles, 1);
    expect(result[0].profile.id).toBe("electronic");
  });

  it("best match for acoustic-like features is 'acoustic'", () => {
    const user: PlaylistFeatureVector = {
      lufs_integrated: -14,
      tempo_bpm: 80,
      energy: 0.30,
      acousticness: 0.80,
    };
    const result = matchPlaylists(user, profiles, 1);
    expect(result[0].profile.id).toBe("acoustic");
  });

  it("score is between 0 and 1", () => {
    const result = matchPlaylists({ energy: 0.5 }, profiles);
    for (const m of result) {
      expect(m.score).toBeGreaterThanOrEqual(0);
      expect(m.score).toBeLessThanOrEqual(1);
    }
  });

  it("perfect match has distance 0 and score 1", () => {
    const exactVector = profiles[0].vector;
    const result = matchPlaylists(exactVector, [profiles[0]], 1);
    expect(result[0].distance).toBeCloseTo(0);
    expect(result[0].score).toBeCloseTo(1);
  });

  it("gaps contains at most 3 features", () => {
    const result = matchPlaylists({ energy: 0.5, danceability: 0.5 }, profiles);
    for (const m of result) {
      expect(m.gaps.length).toBeLessThanOrEqual(3);
    }
  });

  it("gaps are sorted descending by delta", () => {
    const user: PlaylistFeatureVector = {
      energy: 0.1,
      danceability: 0.1,
      tempo_bpm: 50,
      lufs_integrated: -20,
    };
    const result = matchPlaylists(user, profiles, 1);
    const gaps = result[0].gaps;
    for (let i = 0; i < gaps.length - 1; i++) {
      expect(gaps[i].delta).toBeGreaterThanOrEqual(gaps[i + 1].delta);
    }
  });

  it("ignores features where user or profile value is null/undefined", () => {
    const user: PlaylistFeatureVector = { energy: 0.8 }; // only energy set
    const result = matchPlaylists(user, profiles, 1);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].distance).not.toBe(Infinity);
  });

  it("returns Infinity distance when no overlapping features exist", () => {
    const noOverlap: PlaylistFeatureVector = {}; // empty vector
    const result = matchPlaylists(noOverlap, profiles, 1);
    expect(result[0].distance).toBe(Infinity);
  });
});
