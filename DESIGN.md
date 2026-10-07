---
name: FitCore
description: A daily digital ledger for food, movement and habits.
colors:
  cobalt: "#2453ee"
  cobalt-hover: "#1740cc"
  chalk: "#f4f6fa"
  white: "#ffffff"
  navy: "#17253a"
  muted: "#627089"
  line: "#dfe5ef"
  selected: "#e8eeff"
  surface-muted: "#e8edf5"
  citrus: "#e6fa78"
  success: "#145e54"
  success-surface: "#def4ed"
  error: "#b53b35"
  error-surface: "#fff1f0"
typography:
  display:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "48px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  headline-compact:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  headline-desktop:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "36px"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  supporting:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  supporting-desktop:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
  title:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  data:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  control: "8px"
  group: "12px"
  surface: "16px"
  full: "9999px"
spacing:
  base: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "12px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.cobalt-hover}"
    textColor: "{colors.white}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.cobalt}"
    rounded: "{rounded.group}"
    height: "54px"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.navy}"
    rounded: "{rounded.control}"
    padding: "10px 11px"
    height: "46px"
  chip:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.navy}"
    rounded: "{rounded.surface}"
    padding: "20px"
  navigation:
    backgroundColor: "{colors.white}"
    textColor: "{colors.muted}"
    rounded: "{rounded.surface}"
    padding: "7px 5px"
  shared-header:
    textColor: "{colors.navy}"
    padding: "24px 20px 0"
  shared-header-inset:
    textColor: "{colors.navy}"
    padding: "0"
  energy-ruler:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.white}"
    rounded: "{rounded.surface}"
    padding: "19px 22px 17px"
---

# Design System: FitCore

## Overview

**Creative North Star: "Daily digital ledger"**

FitCore uses a chalk ground, confident cobalt controls and navy lettering to make a personal day readable. The visual language is athletic and practical: prominent measurements, plain coaching language, flat sections and restrained borders. Hanken Grotesk connects headings, data and controls without introducing a separate decorative voice.

Daily actions come before advanced explanations. A selected day changes the ledger; food, movement and habit records supply the visible state. The visual system must preserve the distinction between recorded values, calculated estimates and unavailable services.

**Key Characteristics:**

- Chalk surfaces with cobalt action and selection.
- Strong numeric hierarchy and labeled navigation.
- Inline daily tasks and progressively revealed detail.
- Motion that follows a change in user state.

## Colors

### Primary

Cobalt identifies the main action, selected controls and the energy field. Its darker companion is the primary hover treatment.

### Neutral

Chalk is the app ground; white separates useful containers and controls. Navy carries primary information, muted blue-gray carries supporting text, and the line color divides rows and surfaces. Selected and muted surfaces provide quiet grouping.

Success and error colors communicate feedback with explanatory text. Citrus is the energy ruler's measurement accent, not an additional general action color. Macro charts retain distinct data-series colors with visible names and quantities.

**The Action Color Rule.** Use cobalt for action and selection; communicate status through text as well as color.

## Typography

Hanken Grotesk with a sans-serif fallback serves every text role. The frontmatter captures the reused type scale. Standard page headings and Home's greeting share the headline role, with its compact variant at viewport widths up to (390px) and desktop variant from (850px). Supporting page copy uses the supporting role, switching to its desktop variant at the same wide breakpoint; it sits (7px) beneath the heading. The energy reading increases to (66px) on desktop. Section headings commonly sit between (22px) and the title size. Compact control labels and supporting metadata use (11–14px).

Use tabular numerals for changing quantities, daily totals, dates and measurements. Pair every metric with a visible unit or descriptive label. Keep descriptive page copy near the observed (45–50ch) measure.

**The Measurement Rule.** Give a number hierarchy through size and weight, then state its unit and whether it is estimated.

## Layout

The shell occupies the viewport on mobile and scrolls content inside a stable navigation frame. Standard routes have a maximum width of (640px). At (520px), the surrounding canvas gains vertical padding (24px) and a rounded framed shell. Home expands to (1060px) at (850px), with fuel and actions beside timeline and habits; its column gap is (32px). Other routes retain their focused single-column workspace.

Typical page gutters are (20px); Home uses (22px), rising to (38px) on desktop. Reserve approximately (110–125px) below content for the dock and safe area. Home compacts spacing at widths up to (390px), matching the shared compact heading breakpoint; some form controls compact below (360px). Horizontal choice rows may scroll inside their own region without widening the page. Keep form groups and numeric grids readable at narrow widths.

Page organization reflects the shipped tasks: Food starts with search, photo scan and pasted estimate, followed by meals and nutrition; Activity switches between finding a workout and today's log; Diet separates My week, Approach and Food guide; Body leads with a weigh-in and trend, with the calorie scenario collapsed below; Settings separates Profile, Targets, Preferences and Data; Running separates This week from Race & setup. These are route-specific structures, not a mandate to copy Home's composition onto every page.

## Elevation & Depth

Borders, white surfaces and tonal grouping provide most depth. Ordinary sections should not accumulate decorative shadows. The dock uses a diffuse shadow (0 9px 30px #23365526); shared light cards use a restrained shadow (0 5px 20px #263f6410). The wide-screen shell uses ambient framing rather than a hard offset shadow.

## Shapes

Controls use modest corners, grouped controls use a slightly larger radius, and meaningful surfaces use the surface radius in frontmatter. Circular icon controls and the Body weigh-in pill are functional exceptions. Bottom sheets retain larger top corners (28px) and a maximum width of (480px). Do not flatten these distinctions into one repeated card shape.

## Components

### Buttons

Primary actions use cobalt, white text and a clear verb. Secondary entry actions use white, a thin line border and cobalt text. Keep visible keyboard focus: the shared outline is (2px) with a (3px) offset; Home uses a stronger outline (3px) with a (4px) offset. Disabled save actions use a muted surface and explanatory context. Maintain touch targets of at least (44px) as the product accessibility requirement.

### Chips

Choices have legible labels and a pressed state. Category choices become cobalt with white text; equipment and duration choices can use a selected tint with cobalt border and text. Use `aria-pressed` for toggle choices and retain the selected value in the form.

### Cards / Containers

Use white, a line border and the surface radius for the journal and grouped form detail. Prefer open rows and section separation where a container adds no useful grouping. The cobalt energy surface is a signature measurement component, not a generic template for every section.

### Inputs / Fields

Inputs use visible labels, navy text, white or quiet tinted surfaces, a thin border and a cobalt focus outline. Keep numeric units close to the field. Preserve draft values through review; report unavailable analysis and validation failures visibly rather than silently saving an invented result. Weigh-ins and body measurements require finite positive values and show an error for invalid entries. Body's change since start compares the latest weight with the saved profile baseline.

### Navigation

Standard pages reuse Home's FitCore brand/date/profile header. The brand returns to Home; the profile opens Settings, where it returns to Home instead. The header keeps a (26px) gap before the page introduction, with (44px) minimum brand and profile targets. Home and Achievements use the inset variant inside their existing page gutters; other standard pages use the shared header padding. The mark is an inline vector, the date uses compact semibold Hanken, and the profile initial comes from saved state. Camera capture retains its task-specific toolbar.

The bottom dock combines visible icons with text labels. The active route has cobalt text and a sliding selected tint; Scan is a separate cobalt button. Settings remains reachable from the header. Route-local segmented switches use a muted tray, a white selected surface and pressed-state semantics. Food and Body bottom sheets are portalled modal dialogs: the app becomes inert, focus stays in the dialog, Escape closes it, and closing restores focus to the trigger.

### Energy ruler and state

The energy ruler combines an intake value, remaining budget, endpoints and a measured fill; its citrus accent emphasizes the quantity. A dated timeline distinguishes meals, planned activity and completed activity. Habit completion changes the checkbox and text treatment. Empty states describe the missing record and offer the next action. Photo capture uses a dark working surface; review returns to chalk, editable servings, meal placement and explicit estimated values.

Date and dock selection use springs; Home's date spring is stiffness (380) and damping (34). Ordinary control color transitions take (160ms); Home counts and macro fills take (450ms), and inline expansion takes (240ms). Shared route and reveal motion uses brief fades and small travel. Honor reduced motion by removing selection travel, animated counting and expansion timing. Motion must not imply a successful save, live synchronization or reliable analysis when that state has not occurred.

## Do's and Don'ts

### Do:

- Do lead with the active task and keep advanced calculations expandable.
- Do pair measurements with units, labels and estimate language where needed.
- Do keep navigation labeled, focus visible and selection programmatically exposed.
- Do derive visible totals and dates from the actual selected state.
- Do describe device-local storage and unavailable connections honestly.

### Don't:

- Don't use emojis as interface decoration or controls.
- Don't use citrus as a general button or selection palette.
- Don't reproduce obsolete lime, lilac or ink alias names as a new visual identity.
- Don't imply live wearable sync, push notifications or guaranteed photo-analysis accuracy.
- Don't turn compact uppercase kickers, icon-font glyphs or incidental decorative shapes into new system primitives.

Evidence: `tailwind.config.js`, `src/index.css`, `src/theme.css`, `src/screens/home.css`, `src/components/TopBar.tsx`, `src/components/top-bar.css`, Home and BottomNav motion, and the Food, Activity, DietPlan, Body, Settings, Train, Achievements and Camera source structures. The operating direction is recorded in `.impeccable/home-brief.md` as Mode: Operate; the approved shared header normalization is recorded in `.impeccable/streak-brief.md`. Shipping interface drawings are code-led; user-supplied meal and progress photos are content, not generated design assets.
