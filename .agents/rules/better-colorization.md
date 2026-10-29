---
trigger: always_on
---

COLOR SYSTEM & CONTRAST ARCHITECTURE (ANTI-FATIGUE & ACCESSIBILITY)

Strictly ban amateur "theme bleeding" where the primary brand hue (purple, cyan, etc.) is plastered across every container, text, icon, and surface. Follow a neutral-first architecture to protect user eye comfort and maintain WCAG 2.1 AA compliance.

### A. Strict Color Bans (The "Purple Slop" Clause)

1. **NO TONE-ON-TONE INK (Colored Text on Same-Hue Surface):**
   - Strictly ban saturated accent text/icons resting on a darker shade of the same hue (e.g., purple-400 text inside a purple-950 container).
   - Text on dark surfaces MUST use neutral luminance scales (`text-zinc-50`, `text-zinc-300`), not saturated primary colors.
2. **NO NEON-BLACK OPTICAL VIBRATION (Chromostereopsis):**
   - Ban hyper-saturated neon violet/magenta (`#7C3AED`, `#A855F7`, `#D946EF`) placed directly over pure black/near-black without luminance buffering. High-energy violet wavelengths against dark backgrounds cause optical blurring and rapid eye strain.
3. **NO LOW-CONTRAST CHIPS & ICON BOXES:**
   - Ban dark saturated badges with muddy text (e.g., Image 1: dark purple button with violet text). If a background has color, the foreground MUST maintain at least a 4.5:1 contrast ratio.

---

### B. The 60-30-10 Color Discipline

- **60% Foundation (Neutrals):** Background canvas must always be neutral (Slate, Zinc, or Neutral gray scale: `bg-zinc-950`, `bg-zinc-900`). Do NOT tint the canvas heavily with the theme color.
- **30% Structure (Surfaces & Boundaries):** Cards, modals, sidebars, and input borders use neutral steps (`bg-zinc-900`, `border-zinc-800`).
- **10% Intentional Accent:** The brand/primary color is an **interactive tool**, not wallpaper. Use it solely for:
  - Primary Call-to-Action (CTA) buttons
  - Active navigation state indicator (a subtle left border or indicator dot)
  - Key focus rings (`focus-visible:ring-2 focus-visible:ring-primary`)

---

### C. Contrast Ratios & Luminance Hierarchy (WCAG 2.1 AA Compliant)

- **Primary Text:** Minimum 7:1 contrast against canvas (`text-zinc-100` on `bg-zinc-950`).
- **Secondary Text / Meta:** Minimum 4.5:1 contrast (`text-zinc-400` on `bg-zinc-950`).
- **Interactive Icons / Large UI Text:** Minimum 3:1 contrast.
- **Text on Accent Buttons:** When using a saturated accent background (e.g., purple/indigo button), enforce clear contrast:
  - If background is dark/vibrant (`bg-violet-600`): foreground MUST be crisp white (`text-white`), never black text or low-contrast purple.
  - If background is light tint (`bg-violet-500/10`): foreground MUST be an accessible neutral or darkened accent, with a 1px border (`border border-violet-500/20`).

---

### D. Component Color Pattern Matrix

| Element                      | Slop Implementation (BANNED)      | Accessible Engineering Standard                                               |
| :--------------------------- | :-------------------------------- | :---------------------------------------------------------------------------- |
| **Secondary Button / Salin** | `bg-purple-900 text-purple-300`   | `bg-zinc-900 text-zinc-200 border border-zinc-800 hover:bg-zinc-800`          |
| **Active Date Header**       | `text-purple-500 font-bold`       | `text-zinc-100 font-medium` (use accent only on the active calendar date dot) |
| **Primary CTA Button**       | `bg-purple-500 text-black`        | `bg-violet-600 text-white font-medium hover:bg-violet-500 shadow-sm`          |
| **Icon Container**           | `bg-purple-900 border-purple-500` | `bg-zinc-900 border-zinc-800 text-zinc-400`                                   |

---

### E. Code Translation Examples

#### 1. Copy Button ("Salin")

````tsx
// ❌ REJECTED (Unreadable tone-on-tone):
<button className="bg-[#2a1b4e] text-[#a855f7] px-4 py-1.5 rounded-full">
  <CopyIcon className="text-[#a855f7]"/> Salin
</button>

//  ACCEPTED (Crisp, High Contrast, Neutral Surface):
<button className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 hover:text-zinc-100 rounded-md border border-zinc-800 transition-colors">
  <Copy className="h-3.5 w-3.5 text-zinc-400"/>
  <span>Salin</span>
</button>


## 6. UNIVERSAL THEME-AGNOSTIC ARCHITECTURE (SEMANTIC TOKEN ENGINE)

Strictly ban hardcoding specific color hues (`purple-*`, `zinc-*`, `slate-*`, hex codes) inside UI components. Any interface must support infinite themes (Light, Dark, OLED/Midnight, Sepia, Nord, Forest, Cyberpunk, High-Contrast) cleanly by routing all styles strictly through an abstract **Semantic Token System**.

---

### A. The Core Principle: Strict Decoupling of "Hue" and "Role"
Components must never know what color theme is active. Components only know **semantic intent**:

| Role Token | Purpose | Rule Across ANY Theme |
| :--- | :--- | :--- |
| `surface-canvas` | Base layer / app background | Minimum surface contrast; must remain neutral/low-chroma. |
| `surface-card` / `surface-elevated` | Container, modal, card, dropdown | Distinct lightness delta ($\Delta L$) from canvas, never muddy. |
| `border-subtle` | Structural dividers (1px) | Minimum 1.5:1 contrast against its immediate surface. |
| `fg-primary` | Main titles, primary body text | Strictly $\ge 7:1$ contrast ratio against current surface. |
| `fg-secondary` / `fg-muted` | Metadata, helper text, timestamps | Strictly $\ge 4.5:1$ contrast ratio against current surface. |
| `interactive-accent` | Primary buttons, active tabs | High-chroma or solid contrast accent, max 10% UI footprint. |
| `interactive-accent-fg` | Text/icon directly inside accent | Contrast $\ge 4.5:1$ directly against `interactive-accent`. |

---

### B. Universal Contrast & Luminance Laws (Apply to ALL Palettes)

1. **The Dynamic Pair Requirement:**
   - Every background token MUST be paired with its dedicated foreground token.
   - Never write `bg-[token]` without explicitly setting `text-[token-foreground]`.
   - Example: `bg-accent` must ALWAYS pair with `text-accent-fg`. Never assume `text-white` or `text-black`.

2. **The Universal Tone-on-Tone Ban:**
   - Irrespective of the theme palette (emerald, violet, amber, rose, slate), NEVER place a text or icon color whose hue and chroma match the background surface's hue with less than $\Delta L = 50\%$ lightness difference.
   - Secondary actions (like "Salin", "Filter", "Cancel") MUST inherit `surface-card` or `surface-elevated` with `fg-primary` or `fg-secondary`, NEVER a saturated tint of the brand accent.

3. **Chroma Capping on Surfaces (Anti-Fatigue Law):**
   - Canvas and surface backgrounds across all themes must have chroma values capped low (in OKLCH space: $C \le 0.02$).
   - Interfaces must never look like they were dipped in paint. A "Forest" theme uses a dark olive-tinted slate, not pure green. A "Cyberpunk" theme uses deep charcoal with neon accents, not pure purple walls.

4. **Surface Separation via Luminance, Not Glow:**
   - Separation between parent surface and child component must use either a 1px border (`border-subtle`) or a stepped lightness change ($3\% - 8\%$ step in $L$).
   - Never use colored glow effects or dropshadows to define component boundaries.

---

### C. Implementation Blueprint (CSS Variables / Tailwind Tokens)

Never write component classes like `bg-purple-900 text-purple-300`. Define the design system using CSS variables that automatically adapt:

#### 1. CSS Variable Definitions (Theme-Agnostic Contract)
```css
/* Base Contract (Contoh: Dark, Light, dan Custom Sepia) */
:root {
  /* Canvas & Surfaces */
  --bg-canvas: 240 10% 3.9%;
  --bg-surface: 240 10% 6%;
  --bg-surface-elevated: 240 10% 9%;
  --border-subtle: 240 3.7% 15.9%;

  /* Foreground / Typography */
  --fg-primary: 0 0% 98%;
  --fg-secondary: 240 5% 64.9%;

  /* Brand / Interactive Accent */
  --accent: 263.4 70% 50.4%;
  --accent-fg: 0 0% 100%;

  /* Interactive Muted (Copy button, toolbar icon) */
  --btn-muted-bg: 240 3.7% 12%;
  --btn-muted-fg: 240 5% 84%;
  --btn-muted-hover: 240 3.7% 18%;
}

/* Light Theme Variant */
[data-theme="light"] {
  --bg-canvas: 0 0% 100%;
  --bg-surface: 240 5% 96%;
  --bg-surface-elevated: 0 0% 100%;
  --border-subtle: 240 5.9% 90%;
  --fg-primary: 240 10% 3.9%;
  --fg-secondary: 240 3.8% 46.1%;
  --accent: 262.1 83.3% 57.8%;
  --accent-fg: 0 0% 100%;
  --btn-muted-bg: 240 4.8% 95.9%;
  --btn-muted-fg: 240 5.9% 10%;
  --btn-muted-hover: 240 5.9% 90%;
}
````
