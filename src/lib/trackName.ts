const TECHNICAL_TERMS = [
  "master",
  "masters",
  "final",
  "mix",
  "premix",
  "pre-master",
  "premaster",
  "demo",
  "bounce",
  "render",
  "wav",
  "mp3",
  "aiff",
  "flac",
];

export function cleanTrackName(value: string | null | undefined): string {
  if (!value) return "";

  const withoutExtension = value.replace(/\.(wav|mp3|aiff|aif|flac|m4a|ogg)$/i, "");
  const withoutPrefix = withoutExtension.replace(/^\s*\d+\s*[-_. )]+\s*/g, "");
  const normalizedSeparators = withoutPrefix.replace(/[_-]+/g, " ");

  const words = normalizedSeparators
    .split(/\s+/)
    .filter((word) => {
      const cleaned = word.toLowerCase().replace(/[^a-z0-9áàâãéêíóôõúüç]/gi, "");
      if (!cleaned) return false;
      if (TECHNICAL_TERMS.includes(cleaned)) return false;
      if (/^v\d+$/i.test(cleaned)) return false;
      if (/^\d{6,8}$/.test(cleaned)) return false;
      if (/^\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?$/.test(cleaned)) return false;
      return true;
    });

  return words.join(" ").replace(/\s+/g, " ").trim();
}
