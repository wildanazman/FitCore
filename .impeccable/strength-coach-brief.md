# Strength coach extension
Mode: Operate. Scope: Home next action and Activity My plan; keep logging/running/data intact.
## Direction contract
THESIS: A real daily prescription, not a generic workout catalogue.
OWN-WORLD: Inherit FitCore Hanken typography and semantic theme palettes; flat exercise rows, clear day selection, no new visual identity.
STORY: Choose actual gym access, equipment, level and available days; see exercises, sets, reps and rest; record actual work through the existing logger.
FIRST VIEWPORT: Compact Home coach summary; Activity plan tab opens today's session and a Monday-first week strip. Setup is inline when needed.
FORM: Narrow extension of existing Activity and Home; no concept seed needed. Healthy adult starter guidance, not medical treatment or guaranteed muscle growth.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
Source: ACSM 2026 resistance training update. Numerical starter prescriptions and scheduling are FitCore heuristics; progression only suggests change after actual logs. Rest days must not auto-log exercise or calories.

## Documentation outcome — 2026-10-12

Ordinary extension of the incumbent Daily digital ledger world. `DESIGN.md` and `.impeccable/design.json` are preserved; no new system primitives or visual identity were established.

Evidence checked: `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `src/components/StrengthCoach.tsx`, `src/components/strength-coach.css`, `src/screens/activity.css`, and the semantic aliases in `src/theme.css`.

The compact Home coach action and Activity My plan use the existing Hanken Grotesk family, 24px/700 title role, semantic accent/ink/muted/surface/line/tint colors, flat divided exercise rows, pressed-state choice controls, minimum 44px buttons and shared 2px focus outlines with 3px offsets. The setup collapses its field grid at 600px, matching Activity's local responsive threshold. The logger and technique view reuse the existing components. The new Activity switch has three equal columns: My plan, Exercises and Activity log. No shipping raster assets were added.

Local variants remain surface-specific: coach action buttons use the incumbent grouped 12px corners and a 44px minimum rather than promoting a replacement for the canonical 8px/48px primary button; compact day/field controls use 10px corners already present in Activity. Coach hover applies a small brightness change rather than adding a color token. These do not establish new global rules.

Drift reported without repair: the incumbent frontmatter and several sidecar samples still capture fixed cobalt/white values while the current shared implementation derives colors from selectable semantic palettes. The incumbent Activity prose describes the earlier library/journal switch and does not yet include My plan. Those existing files remain unchanged under this extension's write boundary.

Finish review remains separate from this documentation comparison. Final disposition: ship, limited to scoring the two material fixes. The reviewer scored the three-column switch and pre-start next-workout findings resolved. Build, type check and strength coach regression checks passed. Local UI verification covered setup, actual-set save, completion update, test-record cleanup, Home navigation and recovery action. Alternative themes were inherited through semantic tokens, not individually visually exercised.
