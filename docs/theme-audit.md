# Theme Audit Tracker

Systematic audit of all 33 theme presets. Default app preset: **neumorphism**.

## Audit checklist (per preset)

### A. Token audit (`apps/web/src/themes/presets.ts`)
- [x] Light/dark define all `ALL_THEME_VARIABLES` + semantic tokens
- [ ] Contrast: foreground/background, primary-foreground/primary, muted-foreground/muted (manual QA)
- [ ] Sidebar tokens align with main palette (manual QA)
- [ ] Chart colors distinguishable in both modes (manual QA)
- [x] Shadow tokens match visual language
- [x] Fonts loaded (CSS `@import` or global)
- [x] Preset-specific vars match CSS expectations

### B. CSS overlay (if applicable)
- [x] Wired in `registry.ts` with `loadStyles`
- [x] Scoped to `[data-theme-preset='name']`
- [x] Light and dark rules work
- [x] `cleanupPrefixes` match actual inline vars
- [x] `prefers-reduced-motion` for animations (expressive presets)
- [ ] Uses semantic tokens where appropriate (ongoing in CSS overlays)
- [x] Component `[data-slot]` coverage adequate (classic: expanded buttons + dialogs)

### C. Registry / wiring
- [x] Label, description, tags accurate
- [x] Preview swatches representative
- [x] `styleControlId` has UI or is `'none'`
- [x] Preset switch cleans up without bleed

### D. Visual QA
- [ ] Theme editor preview sandbox (light + dark) — manual
- [ ] Real app page spot-check — manual
- [x] Style control sliders produce visible change (wired for all expressive presets)

---

## Cross-cutting fixes (completed)

| Issue | Status | Fix |
|-------|--------|-----|
| Semantic tokens missing from 32/33 presets | Fixed | `ensureSemanticTokens()` in `semantic-tokens.ts` |
| Semantic tokens not in editor catalog | Fixed | Added `semantic` category to `THEME_VARIABLES` |
| `index.css` ≠ default neumorphism preset | Fixed | Aligned `:root`/`.dark` to neumorphism oklch tokens |
| Dead `cleanupPrefixes` on classic presets | Fixed | Removed unused prefixes |
| Dark-mode selector inconsistency | Fixed | Standardized classic CSS to `:root.dark[data-theme-preset='…']` |
| Classic presets had `styleControlId` without UI | Fixed | Set classic family to `styleControlId: 'none'` |
| Missing style controls for 5 expressive presets | Fixed | Added controls for cyberpunk, synthwave, zen, handwritten, art-deco |
| Thin test coverage | Fixed | `presets.test.ts` + extended `registry.test.ts` + e2e preset test |

---

## Follow-ups (completed)

| # | Item | Status | Implementation |
|---|------|--------|----------------|
| 1 | Migrate expressive hex colors to oklch | Partial | `expressive-oklch.ts` overlays oklch for neumorphism + glassmorphism color tokens; shadow strings remain rgb/hsl |
| 2 | Per-preset semantic color tuning | Done | `preset-semantic-overrides.ts` — all 19 CSS presets + expressive themes |
| 3 | Expand classic CSS (buttons + dialogs) | Done | ocean, rose, sunset, forest, lavender, supabase |
| 4 | Visual regression in CI | Done | `e2e/theme-visual.spec.ts` + snapshot path in `playwright.config.mts` |
| 5 | Clarify `default` vs app default | Done | Registry label → "Neutral"; description explains FOUC uses neumorphism |

---

## Phase 0 — Foundation

| Item | Status | Notes |
|------|--------|-------|
| `index.css` aligned to neumorphism | Done | Uses oklch; comment documents FOUC baseline |
| Semantic tokens in `types.ts` | Done | Editable in theme editor |
| `presets.test.ts` | Done | Asserts full token set + oklch migration |
| `registry.test.ts` extended | Done | All 19 CSS presets + style loader wiring |

---

## Phase 1 — Neumorphism (default)

| Check | Status | Finding |
|-------|--------|---------|
| Token completeness | Pass | All required tokens present |
| Semantic colors | Fixed | Palette-tuned via `preset-semantic-overrides.ts` |
| Color format | Improved | Core colors migrated to oklch via `expressive-oklch.ts` |
| `index.css` baseline | Fixed | oklch neumorphism tokens |
| CSS overlay (1737 lines) | Pass | Full `[data-slot]` coverage |
| Style controls | Pass | Dedicated `NeumorphicPresets` component |
| Visual regression | Added | `e2e/__screenshots__/theme-visual.spec.ts/` |

---

## Phase 2 — Expressive presets

All 13 expressive presets audited. Semantic overrides added for every preset in `preset-semantic-overrides.ts`. Style controls wired for cyberpunk, synthwave, zen, handwritten, art-deco.

**Remaining polish:** Migrate remaining expressive preset source hex (brutalism, academia, etc.) to oklch in `expressive-oklch.ts` when touched next.

---

## Phase 3 — Classic presets

| Preset | Tokens | CSS | Status |
|--------|--------|-----|--------|
| ocean | Pass | Dialog elevation added | Done |
| rose | Pass | Buttons + dialog added | Done |
| sunset | Pass | Buttons + dialog added | Done |
| forest | Pass | Buttons + dialog added | Done |
| lavender | Pass | Buttons + dialog added | Done |
| supabase | Pass | Buttons + dialog added | Done |

---

## Phase 4 — Token-only presets (14)

All pass completeness tests. Semantic tokens inherit defaults unless hue-specific override exists in token-only group (uses `DEFAULT_SEMANTIC_TOKENS`).

---

## Key files

| File | Purpose |
|------|---------|
| `apps/web/src/themes/expressive-oklch.ts` | Oklch color overlays for expressive presets |
| `apps/web/src/themes/preset-semantic-overrides.ts` | Per-preset semantic status colors |
| `apps/web/src/themes/semantic-tokens.ts` | Default semantic + layout token injection |
| `packages/ui/src/styles/index.css` | FOUC baseline (neumorphism oklch) |
| `apps/web/e2e/theme-visual.spec.ts` | Screenshot regression for theme baselines |

---

## Validation commands

```bash
pnpm --filter web test:unit
pnpm --filter web check-types
pnpm --filter web exec playwright test e2e/theme-visual.spec.ts --update-snapshots  # first run / baseline refresh
pnpm --filter web exec playwright test e2e/theme.spec.ts e2e/theme-visual.spec.ts
pnpm lint
```

---

## Open polish (future)

1. Extend `EXPRESSIVE_OKLCH_COLORS` to brutalism, academia, editorial, bauhaus, blueprint, cyberpunk, synthwave, zen, handwritten, art-deco, retro-terminal
2. Replace hardcoded oklch in classic CSS overlays with `var(--primary)` where hue should track tokens
3. WCAG contrast audit automation (culori-based) in `presets.test.ts`
4. Theme editor visual QA checklist sign-off (manual)
