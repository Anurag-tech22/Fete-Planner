# Accessibility (WCAG 2.2 AA)

| Criterion                    | Implementation                                                                        | Evidence                    |
| ---------------------------- | ------------------------------------------------------------------------------------- | --------------------------- |
| 1.1.1 Non-text content       | Budget chart has a text description of every slice; decorative emoji are plain text   | `App.test.tsx` (role `img`) |
| 1.3.1 Info and relationships | Every input has a visible label; schedule is a real table with caption and `th scope` | axe-core test               |
| 1.4.1 Use of colour          | Warnings use text and a ⚠ icon, not colour alone                                      | `App.test.tsx`              |
| 1.4.3 / 1.4.11 Contrast      | All text pairs ≥ 4.5:1 and focus colour ≥ 3:1 in light **and** dark themes            | `shared/contrast.test.ts`   |
| 1.4.10 Reflow                | Responsive down to 320 px, no horizontal scroll                                       | CSS grid / flex             |
| 2.1.1 Keyboard               | Everything operable by keyboard; Enter submits refine                                 | `App.test.tsx`              |
| 2.4.1 Bypass blocks          | Skip-to-content link                                                                  | `App.tsx`                   |
| 2.4.3 / 2.4.7 Focus          | Focus moves to the first invalid field and to the plan heading; visible focus ring    | `App.test.tsx`              |
| 2.5.8 Target size            | Checkboxes 24 px, buttons ≥ 44 px                                                     | `styles.css`                |
| 3.3.1 / 3.3.3 Errors         | Inline messages linked with `aria-describedby`, `aria-invalid`                        | `App.test.tsx`              |
| 4.1.2 Name, role, value      | Progress bars, buttons and selects have accessible names (e.g. "RSVP for Meera")      | axe-core test               |
| 4.1.3 Status messages        | `role="status"` live region for progress and results; `role="alert"` for guest errors | `App.test.tsx`              |
| Motion / print               | `prefers-reduced-motion` respected; print stylesheet hides controls                   | `styles.css`                |
| Forced colours               | `forced-colors: active` media query maps bars, cards and buttons to system colours    | `styles.css`                |
| Language                     | `<html lang="en">` on the root element                                                | `index.html`                |

**Real-browser evidence:** `e2e/app.spec.ts` runs axe-core (WCAG 2.0–2.2 A/AA plus best practices, including true colour contrast) on the live production build in light and dark themes on desktop and mobile profiles, and checks keyboard order, 320 px reflow and offline use. Result: 0 violations.

ESLint `jsx-a11y` runs on every commit through `npm run lint`.

**Screen reader compatibility:** The DOM uses semantic HTML (`main`, `section[aria-labelledby]`, `table`/`th[scope]`/`caption`), live regions (`role="status"`, `role="alert"`), and programmatic associations (`aria-describedby`, `aria-invalid`, `aria-label`) rather than custom widgets. This aligns with the ARIA Authoring Practices for expected screen reader behaviour across NVDA, VoiceOver and JAWS. The donut chart carries a full textual `aria-label` so no information is lost when visuals are absent.

**High-contrast mode:** The `@media (forced-colors: active)` block in `styles.css` maps progress bars, warning indicators, cards and buttons to the Windows system colour keywords (`Highlight`, `CanvasText`, `ButtonText`), ensuring the UI remains usable under Windows High Contrast and similar forced-colour schemes.
