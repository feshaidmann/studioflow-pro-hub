# Analytics: Beta Banner & Feedback Modal

Add two PostHog events using the existing `trackEvent` helper in `src/lib/analytics.ts`.

## Events

- `beta_banner_dismissed` — fired when the user clicks the X on the top BetaBanner.
  - props: `{ path: window.location.pathname }`
- `feedback_modal_opened` — fired when the FeedbackButton modal opens.
  - props: `{ path: location.pathname, source: "floating_button" | "beta_banner" | "event" }`

## Changes

### `src/hooks/useBetaBanner.ts`
In `dismissBetaBanner()`, call `trackEvent("beta_banner_dismissed", { path: window.location.pathname })` before setting sessionStorage.

### `src/components/BetaBanner.tsx`
In `handleOpenFeedback`, dispatch the existing `open-feedback` event with `detail: { source: "beta_banner" }`.

### `src/components/FeedbackButton.tsx`
- Update the `open-feedback` listener to read `e.detail?.source` (default `"event"`) and store it in state.
- Wrap the floating button `onClick` to call `setOpen(true)` with source `"floating_button"`.
- Add a `useEffect` that fires `trackEvent("feedback_modal_opened", { path: location.pathname, source })` whenever `open` transitions to `true`.

## Notes
- `trackEvent` is a no-op until PostHog is initialized (placeholder key), so this is safe to ship now and starts emitting once the key is set.
- No new dependencies, no schema changes.
