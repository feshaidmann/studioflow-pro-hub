/**
 * Smoothly scroll an element into view, accounting for the fixed mobile header
 * (h-12 = 48px) and the correct scroll container (mobile = <main>, desktop = window).
 */
export function scrollToAnchor(
  elementId: string,
  opts?: { extraOffset?: number; focusSelector?: string }
) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const headerOffset = isMobile ? 48 : 0;
  const margin = 12 + (opts?.extraOffset ?? 0);
  const offset = headerOffset + margin;

  const scrollContainer = isMobile
    ? (document.querySelector("main") as HTMLElement | null)
    : null;

  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const top =
      elRect.top - containerRect.top + scrollContainer.scrollTop - offset;
    scrollContainer.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  } else {
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  if (opts?.focusSelector) {
    setTimeout(() => {
      const target = document.querySelector<HTMLElement>(opts.focusSelector!);
      target?.focus({ preventScroll: true });
    }, 450);
  }
}
