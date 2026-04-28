# Design Language: Preply: Learn with the best online language tutors on app & web

> Extracted from `https://preply.com` on April 21, 2026
> 1705 elements analyzed

This document describes the complete design language of the website. It is structured for AI/LLM consumption — use it to faithfully recreate the visual design in any framework.

## Color Palette

### Primary Colors

| Role | Hex | RGB | HSL | Usage Count |
|------|-----|-----|-----|-------------|
| Primary | `#ff7aac` | rgb(255, 122, 172) | hsl(337, 100%, 74%) | 5 |
| Secondary | `#121117` | rgb(18, 17, 23) | hsl(250, 15%, 8%) | 1916 |
| Accent | `#99c5ff` | rgb(153, 197, 255) | hsl(214, 100%, 80%) | 1 |

### Neutral Colors

| Hex | HSL | Usage Count |
|-----|-----|-------------|
| `#ffffff` | hsl(0, 0%, 100%) | 477 |
| `#384047` | hsl(208, 12%, 25%) | 256 |
| `#4d4c5c` | hsl(244, 10%, 33%) | 148 |
| `#dcdce5` | hsl(240, 15%, 88%) | 36 |
| `#000000` | hsl(0, 0%, 0%) | 35 |
| `#808080` | hsl(0, 0%, 50%) | 6 |
| `#6a697c` | hsl(243, 8%, 45%) | 3 |

### Background Colors

Used on large-area elements: `#141414`, `#ff7aac`, `#ffffff`, `#3ddabe`, `#121117`

### Text Colors

Text color palette: `#384047`, `#121117`, `#ffffff`, `#0000ee`, `#000000`, `#808080`, `#4d4c5c`

### Full Color Inventory

| Hex | Contexts | Count |
|-----|----------|-------|
| `#121117` | text, border, background | 1916 |
| `#ffffff` | text, border, background | 477 |
| `#384047` | text, border | 256 |
| `#0000ee` | text, border | 192 |
| `#4d4c5c` | text, border | 148 |
| `#dcdce5` | border, background | 36 |
| `#000000` | text, border | 35 |
| `#808080` | text, border | 6 |
| `#ff7aac` | background | 5 |
| `#ffe03d` | background | 4 |
| `#141452` | border | 4 |
| `#6a697c` | border | 3 |
| `#2885fd` | border, background | 2 |
| `#7bead6` | background | 1 |
| `#3ddabe` | background | 1 |
| `#99c5ff` | background | 1 |

## Typography

### Font Families

- **Figtree** — used for body (1475 elements)
- **PreplyInterV** — used for body (129 elements)
- **Platform** — used for all (85 elements)
- **BlinkMacSystemFont** — used for body (13 elements)
- **Arial** — used for body (3 elements)

### Type Scale

| Size (px) | Size (rem) | Weight | Line Height | Letter Spacing | Used On |
|-----------|------------|--------|-------------|----------------|---------|
| 96px | 6rem | 700 | 96px | -0.48px | h2, p |
| 64px | 4rem | 700 | 68px | -0.32px | h1, br, h2 |
| 48px | 3rem | 700 | 52px | normal | h3 |
| 32px | 2rem | 700 | 36px | 0.32px | p, h3, span |
| 24px | 1.5rem | 700 | 32px | 0.3px | p, h3 |
| 20px | 1.25rem | 400 | 28px | -0.1px | p, div, span, svg |
| 18px | 1.125rem | 400 | 24px | 0.09px | button, span, svg, path |
| 16px | 1rem | 600 | 24px | normal | span, p, div, br |
| 14px | 0.875rem | 400 | normal | normal | html, head, meta, title |
| 13.3333px | 0.8333rem | 400 | normal | normal | button, img |
| 0px | 0rem | 400 | normal | normal | div, img |

### Heading Scale

```css
h2 { font-size: 96px; font-weight: 700; line-height: 96px; }
h1 { font-size: 64px; font-weight: 700; line-height: 68px; }
h3 { font-size: 48px; font-weight: 700; line-height: 52px; }
h3 { font-size: 32px; font-weight: 700; line-height: 36px; }
h3 { font-size: 24px; font-weight: 700; line-height: 32px; }
h5 { font-size: 20px; font-weight: 400; line-height: 28px; }
h4 { font-size: 14px; font-weight: 400; line-height: normal; }
```

### Body Text

```css
body { font-size: 14px; font-weight: 400; line-height: normal; }
```

### Font Weights in Use

`400` (1435x), `600` (200x), `700` (70x)

## Spacing

**Base unit:** 2px

| Token | Value | Rem |
|-------|-------|-----|
| spacing-2 | 2px | 0.125rem |
| spacing-24 | 24px | 1.5rem |
| spacing-48 | 48px | 3rem |
| spacing-60 | 60px | 3.75rem |
| spacing-69 | 69px | 4.3125rem |
| spacing-96 | 96px | 6rem |
| spacing-160 | 160px | 10rem |

## Border Radii

| Label | Value | Count |
|-------|-------|-------|
| xs | 2px | 1 |
| md | 8px | 49 |
| lg | 16px | 2 |

## Box Shadows

**sm** — blur: 8px
```css
box-shadow: rgba(9, 15, 25, 0.1) 0px 0px 8px 0px;
```

**xl** — blur: 68px
```css
box-shadow: rgba(0, 0, 0, 0.3) 0px 32px 68px 0px;
```

## CSS Custom Properties

### Other

```css
--ds-dialog-overlay-z-index-override: 100;
--ds-dialog-content-z-index-override: 100;
--ds-onboarding-tooltip-z-index-override: 101;
--ds-tooltip-z-index-override: 101;
--ds-dropdown-menu-overlay-z-index-override: var(--ds-dialog-overlay-z-index-override);
--ds-dropdown-menu-content-z-index-override: var(--ds-dialog-content-z-index-override);
```

### Dependencies

```css
--ds-dropdown-menu-overlay-z-index-override: --ds-dialog-overlay-z-index-override;
--ds-dropdown-menu-content-z-index-override: --ds-dialog-content-z-index-override;
```

### Semantic

```css
success: [object Object];
warning: [object Object];
error: [object Object];
info: [object Object];
```

## Breakpoints

| Name | Value | Type |
|------|-------|------|
| 400px | 400px | max-width |
| sm | 640px | max-width |
| sm | 700px | max-width |
| md | 781px | max-width |
| 880px | 880px | min-width |
| lg | 960px | max-width |
| 1200px | 1200px | min-width |
| 1900px | 1900px | min-width |

## Transitions & Animations

**Easing functions:** `[object Object]`, `[object Object]`

**Durations:** `0.22s`, `0.9s`, `0.2s`, `0.3s`, `0.6s`, `0.1s`, `0.4s`, `0.5s`

### Common Transitions

```css
transition: all;
transition: color 0.22s cubic-bezier(0.22, 1, 0.36, 1);
transition: color 0.22s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.22s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.22s cubic-bezier(0.22, 1, 0.36, 1);
transition: transform 0.9s;
transition: transform 0.2s;
transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
transition: opacity 0.3s;
transition: opacity 0.6s ease-in-out 0.2s, transform 0.6s ease-in-out 0.2s;
transition: opacity 0.6s ease-in-out 0.3s, transform 0.6s ease-in-out 0.3s;
transition: opacity 0.3s ease-in-out 0.1s, transform 0.3s ease-in-out 0.1s;
```

### Keyframe Animations

**spin__6opuF**
```css
@keyframes spin__6opuF {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(1turn); }
}
```

**appear__G3E6P**
```css
@keyframes appear__G3E6P {
  0% { opacity: 0; transform: scale(0); }
  100% { opacity: 1; transform: scale(1); }
}
```

**disappear__Y33gr**
```css
@keyframes disappear__Y33gr {
  0% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0); }
}
```

**styles_flickerAnimation__fegUy**
```css
@keyframes styles_flickerAnimation__fegUy {
  0% { opacity: 1; }
  50% { opacity: 0.3; }
  100% { opacity: 1; }
}
```

**styles-module_fade-in__wcQcH**
```css
@keyframes styles-module_fade-in__wcQcH {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
```

## Component Patterns

Detected UI component patterns and their most common styles:

### Buttons (52 instances)

```css
.button {
  background-color: rgb(18, 17, 23);
  color: rgb(18, 17, 23);
  font-size: 14px;
  font-weight: 400;
  padding-top: 0px;
  padding-right: 0px;
  border-radius: 0px;
}
```

### Cards (11 instances)

```css
.card {
  background-color: rgb(255, 255, 255);
  border-radius: 8px;
  box-shadow: rgba(9, 15, 25, 0.1) 0px 0px 8px 0px;
  padding-top: 0px;
  padding-right: 0px;
}
```

### Links (208 instances)

```css
.link {
  color: rgb(255, 255, 255);
  font-size: 14px;
  font-weight: 400;
}
```

### Navigation (2 instances)

```css
.navigatio {
  color: rgb(18, 17, 23);
  padding-top: 0px;
  padding-bottom: 0px;
  padding-left: 0px;
  padding-right: 0px;
  position: static;
}
```

### Footer (20 instances)

```css
.foote {
  background-color: rgb(18, 17, 23);
  color: rgb(18, 17, 23);
  padding-top: 0px;
  padding-bottom: 0px;
  font-size: 14px;
}
```

### Modals (4 instances)

```css
.modal {
  background-color: rgb(18, 17, 23);
  border-radius: 0px;
  box-shadow: rgba(0, 0, 0, 0.3) 0px 32px 68px 0px;
  padding-top: 0px;
  padding-right: 0px;
}
```

### Dropdowns (100 instances)

```css
.dropdown {
  border-radius: 0px;
  border-color: rgb(18, 17, 23);
  padding-top: 0px;
}
```

### Badges (4 instances)

```css
.badge {
  background-color: rgb(255, 223, 61);
  color: rgb(18, 17, 23);
  font-size: 16px;
  font-weight: 400;
  padding-top: 6px;
  padding-right: 10px;
  border-radius: 4px;
}
```

### Avatars (4 instances)

```css
.avatar {
  border-radius: 4px;
}
```

### Switches (1 instances)

```css
.switche {
  border-radius: 0px;
  border-color: rgb(18, 17, 23);
}
```

## Component Clusters

Reusable component instances grouped by DOM structure and style similarity:

### Button — 6 instances, 3 variants

**Variant 1** (1 instance)

```css
  background: rgb(18, 17, 23);
  color: rgb(255, 255, 255);
  padding: 0px 0px 0px 0px;
  border-radius: 8px;
  border: 2px solid rgba(18, 17, 23, 0);
  font-size: 14px;
  font-weight: 600;
```

**Variant 2** (4 instances)

```css
  background: rgba(0, 0, 0, 0);
  color: rgb(18, 17, 23);
  padding: 6px 24px 6px 24px;
  border-radius: 8px;
  border: 2px solid rgba(0, 0, 0, 0);
  font-size: 18px;
  font-weight: 600;
```

**Variant 3** (1 instance)

```css
  background: rgb(255, 122, 172);
  color: rgb(18, 17, 23);
  padding: 0px 0px 0px 0px;
  border-radius: 8px;
  border: 2px solid rgb(18, 17, 23);
  font-size: 18px;
  font-weight: 600;
```

### Button — 1 instance, 1 variant

**Variant 1** (1 instance)

```css
  background: rgba(0, 0, 0, 0);
  color: rgb(18, 17, 23);
  padding: 0px 4px 0px 16px;
  border-radius: 0px;
  border: 0px none rgb(18, 17, 23);
  font-size: 14px;
  font-weight: 400;
```

### Button — 6 instances, 3 variants

**Variant 1** (3 instances)

```css
  background: rgba(0, 0, 0, 0);
  color: rgb(18, 17, 23);
  padding: 6px 16px 6px 16px;
  border-radius: 8px;
  border: 2px solid rgb(18, 17, 23);
  font-size: 14px;
  font-weight: 600;
```

**Variant 2** (2 instances)

```css
  background: rgb(18, 17, 23);
  color: rgb(255, 255, 255);
  padding: 6px 28px 6px 28px;
  border-radius: 8px;
  border: 2px solid rgba(18, 17, 23, 0);
  font-size: 18px;
  font-weight: 600;
```

**Variant 3** (1 instance)

```css
  background: rgb(153, 197, 255);
  color: rgb(18, 17, 23);
  padding: 6px 28px 6px 28px;
  border-radius: 8px;
  border: 2px solid rgb(18, 17, 23);
  font-size: 18px;
  font-weight: 600;
```

### Button — 1 instance, 1 variant

**Variant 1** (1 instance)

```css
  background: rgba(0, 0, 0, 0);
  color: rgb(18, 17, 23);
  padding: 0px 0px 0px 0px;
  border-radius: 0px;
  border: 0px none rgb(18, 17, 23);
  font-size: 18px;
  font-weight: 600;
```

### Button — 7 instances, 2 variants

**Variant 1** (3 instances)

```css
  background: rgba(0, 0, 0, 0);
  color: rgb(18, 17, 23);
  padding: 0px 0px 0px 0px;
  border-radius: 0px;
  border: 0px none rgb(18, 17, 23);
  font-size: 14px;
  font-weight: 400;
```

**Variant 2** (4 instances)

```css
  background: rgba(0, 0, 0, 0);
  color: rgb(255, 255, 255);
  padding: 0px 0px 0px 0px;
  border-radius: 0px;
  border: 0px none rgb(255, 255, 255);
  font-size: 14px;
  font-weight: 400;
```

### Card — 1 instance, 1 variant

**Variant 1** (1 instance)

```css
  background: rgba(0, 0, 0, 0);
  color: rgb(18, 17, 23);
  padding: 0px 0px 0px 0px;
  border-radius: 0px;
  border: 0px none rgb(18, 17, 23);
  font-size: 14px;
  font-weight: 400;
```

### Card — 3 instances, 1 variant

**Variant 1** (3 instances)

```css
  background: rgb(255, 255, 255);
  color: rgb(18, 17, 23);
  padding: 32px 32px 0px 32px;
  border-radius: 4px;
  border: 1px solid rgb(18, 17, 23);
  font-size: 14px;
  font-weight: 400;
```

### Button — 1 instance, 1 variant

**Variant 1** (1 instance)

```css
  background: rgba(0, 0, 0, 0);
  color: rgb(18, 17, 23);
  padding: 0px 0px 0px 0px;
  border-radius: 0px;
  border: 0px none rgb(18, 17, 23);
  font-size: 14px;
  font-weight: 400;
```

### Button — 2 instances, 1 variant

**Variant 1** (2 instances)

```css
  background: rgba(0, 0, 0, 0);
  color: rgb(0, 0, 0);
  padding: 0px 0px 0px 0px;
  border-radius: 0px;
  border: 0px none rgb(0, 0, 0);
  font-size: 13.3333px;
  font-weight: 400;
```

## Layout System

**7 grid containers** and **332 flex containers** detected.

### Container Widths

| Max Width | Padding |
|-----------|---------|
| 1440px | 96px |
| 496px | 0px |
| 90% | 0px |
| 100% | 16px |
| 1280px | 0px |
| 890px | 0px |
| 510px | 0px |

### Grid Column Patterns

| Columns | Usage Count |
|---------|-------------|
| 2-column | 3x |
| 3-column | 2x |
| 4-column | 2x |

### Grid Templates

```css
grid-template-columns: 40px 1120px 40px;
gap: 24px;
grid-template-columns: 624px 624px;
grid-template-columns: 405.328px 405.328px 405.344px;
gap: 16px;
grid-template-columns: 300px 300px 300px 300px;
gap: 16px;
grid-template-columns: 300px 300px 300px 300px;
gap: 16px;
```

### Flex Patterns

| Direction/Wrap | Count |
|----------------|-------|
| row/nowrap | 193x |
| column/nowrap | 45x |
| row/wrap | 32x |
| column/wrap | 60x |
| row-reverse/nowrap | 2x |

**Gap values:** `12px`, `16px`, `24px`, `2px`, `32px`, `48px`, `4px`, `64px`, `8px`, `96px`, `normal 16px`, `normal 8px`

## Responsive Design

### Viewport Snapshots

| Viewport | Body Font | Nav Visible | Max Columns | Hamburger | Page Height |
|----------|-----------|-------------|-------------|-----------|-------------|
| mobile (375px) | 14px | No | 2 | Yes | 9679px |
| tablet (768px) | 14px | No | 2 | Yes | 8448px |
| desktop (1280px) | 14px | No | 3 | No | 6787px |
| wide (1920px) | 14px | No | 3 | No | 6810px |

### Breakpoint Changes

**375px → 768px** (mobile → tablet):
- Page height: `9679px` → `8448px`

**768px → 1280px** (tablet → desktop):
- H1 size: `48px` → `64px`
- Hamburger menu: `shown` → `hidden`
- Max grid columns: `2` → `3`
- Page height: `8448px` → `6787px`

## Accessibility (WCAG 2.1)

**Overall Score: 100%** — 3 passing, 0 failing color pairs

### Passing Color Pairs

| Foreground | Background | Ratio | Level |
|------------|------------|-------|-------|
| `#121117` | `#ffffff` | 18.78:1 | AAA |
| `#121117` | `#ff7aac` | 7.72:1 | AAA |

## Design System Score

**Overall: 84/100 (Grade: B)**

| Category | Score |
|----------|-------|
| Color Discipline | 92/100 |
| Typography Consistency | 50/100 |
| Spacing System | 100/100 |
| Shadow Consistency | 100/100 |
| Border Radius Consistency | 100/100 |
| Accessibility | 100/100 |
| CSS Tokenization | 75/100 |

**Strengths:** Tight, disciplined color palette, Well-defined spacing scale, Clean elevation system, Consistent border radii, Strong accessibility compliance, Good CSS variable tokenization

**Issues:**
- 5 font families — consider limiting to 2 (heading + body)
- 82% of CSS is unused — consider purging
- 3150 duplicate CSS declarations

## Z-Index Map

**9 unique z-index values** across 4 layers.

| Layer | Range | Elements |
|-------|-------|----------|
| modal | 2147483646,2147483646 | div.o.v.e.r.l.a.y, div.c.m.p.-.w.r.a.p.p.e.r. .c.m.p. .f.i.r.s.t. .b.o.t.t.o.m. .d.e.s.k.t.o.p. .z.o.o.m.-.n.o.r.m.a.l. .b.a.n.n.e.r |
| dropdown | 100,101 | div.D.r.a.w.e.r.-.m.o.d.u.l.e._.D.r.a.w.e.r._._.s.D.f.d.l, ol.s.t.y.l.e.s.-.m.o.d.u.l.e._.p.o.r.t._._.-.K.x.X.3 |
| sticky | 10,10 | div.s.t.y.l.e.s._.T.o.p.P.r.o.m.p.t._._.O.Z.G.b.i |
| base | -1,6 | img.s.t.y.l.e.s.-.m.o.d.u.l.e._.i.m.a.g.e._._.L.A.g.3.H. .s.t.y.l.e.s.-.m.o.d.u.l.e._.l.a.y.e.r._._.t.9.f.6.H. .s.t.y.l.e.s.-.m.o.d.u.l.e._.o.n._._.s.t.M.f.j, img.s.t.y.l.e.s.-.m.o.d.u.l.e._.i.m.a.g.e._._.L.A.g.3.H. .s.t.y.l.e.s.-.m.o.d.u.l.e._.l.a.y.e.r._._.t.9.f.6.H. .s.t.y.l.e.s.-.m.o.d.u.l.e._.o.n._._.s.t.M.f.j, img.s.t.y.l.e.s.-.m.o.d.u.l.e._.i.m.a.g.e._._.L.A.g.3.H. .s.t.y.l.e.s.-.m.o.d.u.l.e._.l.a.y.e.r._._.t.9.f.6.H. .s.t.y.l.e.s.-.m.o.d.u.l.e._.o.n._._.s.t.M.f.j |

**Issues:**
- [object Object]

## SVG Icons

**29 unique SVG icons** detected. Dominant style: **filled**.

| Size Class | Count |
|------------|-------|
| xs | 6 |
| sm | 3 |
| md | 7 |
| lg | 3 |
| xl | 10 |

**Icon colors:** `rgb(0, 0, 0)`, `#121117`, `rgb(18, 17, 23)`, `rgb(255, 255, 255)`, `#fff`, `rgb(77, 76, 92)`, `#BD3D44`, `#192F5D`, `#e0e2e3`, `#E0E2E3`

## Font Files

| Family | Source | Weights | Styles |
|--------|--------|---------|--------|
| PreplyInterV | self-hosted | 400 700 | oblique 0deg 10deg |
| PreplyInter | self-hosted | 400, 500, 700 | normal, oblique 10deg |
| Platform | self-hosted | 700 | normal |
| Figtree | self-hosted | 400, 600 | italic, normal |
| Noto Sans | self-hosted | 400, 500, 600, 700 | italic, normal |

## Image Style Patterns

| Pattern | Count | Key Styles |
|---------|-------|------------|
| thumbnail | 37 | objectFit: fill, borderRadius: 0px, shape: square |
| gallery | 13 | objectFit: fill, borderRadius: 0px, shape: square |
| general | 11 | objectFit: fill, borderRadius: 4px, shape: rounded |

**Aspect ratios:** 1:1 (38x), 3:4 (13x), 4:3 (3x), 2:3 (3x), 3.69:1 (1x), 2.06:1 (1x), 3:1 (1x), 3.4:1 (1x)

## Motion Language

**Feel:** responsive · **Scroll-linked:** yes

### Duration Tokens

| name | value | ms |
|---|---|---|
| `xs` | `100ms` | 100 |
| `sm` | `200ms` | 200 |
| `md` | `300ms` | 300 |
| `lg` | `500ms` | 500 |
| `xl` | `900ms` | 900 |

### Easing Families

- **ease-out** (158 uses) — `cubic-bezier(0.22, 1, 0.36, 1)`
- **ease-in-out** (12 uses) — `ease`

## Component Anatomy

### button — 24 instances

**Slots:** label, icon
**Sizes:** medium

### card — 4 instances

**Slots:** media

## Brand Voice

**Tone:** friendly · **Pronoun:** you-only · **Headings:** unknown (tight)

### Top CTA Verbs

- **show** (3)
- **book** (2)
- **english** (1)
- **log** (1)
- **find** (1)
- **become** (1)
- **how** (1)
- **refer** (1)

### Button Copy Patterns

- "show more" (3×)
- "english, usd" (1×)
- "log in" (1×)
- "find your tutor" (1×)
- "become a tutor" (1×)
- "how our platform works" (1×)
- "book a demo
refer your company" (1×)
- "book a demo" (1×)
- "refer your company" (1×)
- "status" (1×)

## Quick Start

To recreate this design in a new project:

1. **Install fonts:** Add `Figtree` from Google Fonts or your font provider
2. **Import CSS variables:** Copy `variables.css` into your project
3. **Tailwind users:** Use the generated `tailwind.config.js` to extend your theme
4. **Design tokens:** Import `design-tokens.json` for tooling integration
