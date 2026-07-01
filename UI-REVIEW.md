# AgroDesk — UI Review (Dealer app + Ops console)

_Reviewed 14 June 2026 against the ui-ux-pro-max checklist. Findings reference real files and lines._

## Note on file integrity (read first)

While reviewing, a build sandbox reported `App.tsx`, `pages/auth/Login.tsx`, and `store/index.ts` as truncated and failing to compile. On checking the **actual files**, all three are intact and well-formed (`App.tsx` ends correctly at `export default App;`, the store's `partialize` is complete, the register form is whole). The sandbox had cached a mid-save snapshot of those three (the only files git shows as modified). **No truncation bug exists.** As a precaution, run `npm run build` locally once — if it passes (it should), ignore this paragraph. Everything below is based on the real file contents.

---

## P0 — Users will hit these

1. **Deep links 404 on refresh in production.** The app uses `BrowserRouter` (`App.tsx`) but there is **no `vercel.json`** with an SPA rewrite. On Vercel, refreshing or sharing any URL except `/` (e.g. `/crm/contacts`) returns a 404. Fix: add `frontend/vercel.json` with `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.

2. **Dead header controls that look interactive.** In `components/layout/Header.tsx`, the **Search** input, the **Mic** button, and the **Language** switcher button have no handlers — clicking/typing does nothing. The language switcher is especially misleading since language selection is a core feature. Fix: wire them up, or remove/disable until implemented.

3. **Broken location string.** `Sidebar.tsx` (line 60) and the Dashboard subtitle render `{dealer.city}, {dealer.state}`, but the backend returns `district`, not `state`. Result: "Nashik, " with a trailing comma and empty value. Fix: use `dealer.district` (or set `state` on login).

4. **Favicon 404.** `index.html` points to `/agrodesk-icon.svg`, but `public/` only contains `favicon.svg` and `icons.svg`. Fix: reference `/favicon.svg` or add the missing asset.

5. **Notification center can never show history.** `store/index.ts` auto-removes every notification after 4s, but the bell dropdown reads the same array — so the "notification center" always shows "No new notifications" a few seconds after anything happens. Fix: separate transient toasts from a persisted notification list (only auto-dismiss the toast).

6. **Ops console forces re-login on every refresh.** `agrodesk Ops/ops/src/App.tsx` only persists `token`, not `user`, and the token-validation path is a TODO (`if (!user && token) … just show login`). So an admin with a valid token is bounced to the login screen on any page reload. Fix: validate the token on mount and rehydrate `user`.

---

## Accessibility (CRITICAL per the checklist)

7. **Clickable `<div>`s aren't keyboard-accessible.** List rows and tiles use `<div onClick>` with no `role`/`tabIndex`/key handler: `pages/ai-salesman/AISalesman.tsx` (conversation list), `pages/ai-accountant/AIAccountant.tsx` (upload tile + accountant rows), and all Ops nav items + Sign Out (`Ops/ops/src/App.tsx`). Keyboard and screen-reader users can't reach them. Fix: use `<button>` (or add `role="button"`, `tabIndex={0}`, and Enter/Space handlers).

8. **Modal is incomplete for a11y.** `components/ui/index.tsx` Modal closes on backdrop/X (good) but has **no Escape-to-close, no focus trap, and doesn't lock background scroll**. Fix: add a `keydown` Escape listener, focus the dialog on open, and set `overflow:hidden` on body while open.

9. **Low-contrast secondary text.** `--text-muted: rgba(240,253,244,0.35)` (index.css) is used widely for sub-labels and helper text; at 35% opacity it almost certainly fails WCAG AA (4.5:1) on the dark background. Fix: raise to ~0.55–0.6 and verify with a contrast checker.

10. **Smaller items:** `<html lang="en">` is static despite a Marathi-first, multilingual product (should reflect the active language); the avatar is a `cursor-pointer` div, not a button.

---

## Consistency, data & polish

11. **Emoji used as icons.** `lib/utils.ts` `BILL_CATEGORIES` uses 🚜📋⚙️🔧💵📁 (rendered in AI Accountant) and the login screen uses "🚜 Try the Live Demo". The checklist flags emoji-as-icons (inconsistent across platforms, not themeable). Fix: swap for Lucide icons (`Tractor`, `FileText`, `Wrench`, `Banknote`, `Folder`…).

12. **Charts show hardcoded mock data.** `Dashboard.tsx` (`salesData`, `channelData`) and the `Analytics` view in `App.tsx` render static arrays, and the Analytics subtitle is hardcoded "January 2024". The dashboard also always says "Good morning" regardless of time. These read as real to a client. Fix: wire to API data (or clearly label as sample) and compute the greeting/date.

13. **Loading/empty/error states are inconsistent.** A `.skeleton` shimmer is defined in `index.css` but **never used**. Contacts and Used Tractor have no empty state; Dashboard has no error state. Fix: standardize loading (skeletons), empty (the existing `EmptyState`), and error states across pages that call `useApi`.

14. **Images:** `UsedTractor.tsx` `<img>` has `alt` (good) but no `width`/`height` (causes layout shift) and no `onError` fallback for broken photo URLs.

---

## Hygiene (low risk, worth doing before handover)

15. **Seven unused dependencies** inflate the bundle and confuse handover: `framer-motion` **and** `motion` (duplicate, neither imported), `@tanstack/react-query`, `@tanstack/react-table`, `react-hook-form`, `react-dropzone`, `date-fns`. Fix: remove what you're not using (the AI Accountant rolled its own dropzone, so `react-dropzone` is dead).

16. **Mobile/responsive:** `h-screen` is used instead of `min-h-dvh` (mobile browser chrome can clip content), and there's no mobile navigation — the sidebar is always docked and the header search is hidden below `md`. Fine if this is desktop-only for dealers; flag it if not.

17. **Ops console inconsistencies:** it's branded "Sovereign Vault / OPS CONSOLE" (not AgroDesk), uses inline `style={{}}` objects instead of the dealer app's token system, and navigates via local state instead of routes (no URLs, no browser back, no deep links). Align branding and consider routing before client handover.

---

### What's solid
Cohesive dark glass design system with CSS-variable tokens, consistent Lucide iconography (outside the emoji spots), a clean reusable component library (`components/ui`), good `cn()`/Tailwind discipline, sensible `EmptyState`/`MetricCard`/`Modal` primitives, and a thoughtful demo-mode banner. Most issues above are wiring and polish, not structural.
