# Style Guide & Client Requirements

> Last updated: February 2025

---

## Scope Changes

- **Removed**: ICO sale page and post-presale dashboard
- **Kept**: Private Sale countdown, BIG token Private Sale page → rolls into final dashboard
- **Terminology**: Replace "PreSale" with "Private Sale" in all locations

---

## Color System (Approved Palette)

| Token | Color | HEX | Usage |
|-------|-------|-----|-------|
| Background (Primary) | Off-white / soft gray | `#F7F8FA` or `#F5F6F8` | Full page background, content sections, tables |
| Primary Accent | Muted emerald / forest green | `#1F7A63` or `#2E8B6F` | Primary CTA buttons, progress indicators, key metrics |
| Secondary Accent | Desaturated navy / slate blue | `#1E3557` or `#243B5A` | Section headers, links, chart outlines |
| Text Primary | Charcoal / dark slate | `#1C1F23` | Main text content |
| Text Secondary | Muted gray | `#6B7280` | Secondary text, captions |

### Purpose

- **Off-white background**: Reduces eye fatigue, increases trust, improves comprehension
- **Muted emerald**: Signals financial growth, stability, capital preservation
- **Desaturated navy**: Reinforces trust and professionalism without overpowering

---

## Color Usage Rules

> **Mandatory restrictions**

- ❌ No neon, gradients, or high-saturation blues
- ❌ No full dark-mode for fundraising pages (acceptable only for dashboards post-launch)
- ❌ Green should never be used as a background — accent only
- ❌ Blue should be secondary to green, not dominant

---

## Component Guidelines

### Buttons

| Type | Style |
|------|-------|
| Primary CTA | Green background (`#1F7A63`), white text |
| Secondary CTA | White background, navy border/text |
| Hover states | Darken color slightly, no glow effects |

**Examples of Primary CTA**: "Participate", "Connect Wallet"

### Charts & Tokenomics Visuals

- Bars/lines: navy base with green highlights
- Backgrounds: white or very light gray
- Use 1–2 colors max (avoid rainbow palettes)

### Cards & Sections

- White cards on off-white background
- Subtle shadow or 1px border (low contrast)
- Rounded corners: 4–6px (minimal)

---

## Brand Positioning

Target visual association: **Stripe / Vanguard / BlackRock-style fintech**

- Infrastructure-grade
- Regulation-ready
- Long-term capital focused
- Distinct from speculative crypto aesthetics

> **Note**: This color system is optimized for capital formation and investor trust, not social virality. Consistency and restraint are mandatory — do not introduce additional accent colors without approval.

---

## CSS Variables Reference

> **Note**: This is a design reference. The actual implementation
> in `src/index.css` uses `--ico-*` prefixed names in HSL format (shadcn/ui convention)
> with `hsl()` wrapping — e.g. `--ico-bg-primary: 220 20% 98%` instead of `--bg-primary: #F7F8FA`.
> The color values are identical; only the naming and format differ.

```css
:root {
  /* Backgrounds */
  --bg-primary: #F7F8FA;
  --bg-secondary: #F5F6F8;
  --bg-card: #FFFFFF;

  /* Primary Accent (Green) */
  --accent-primary: #1F7A63;
  --accent-primary-alt: #2E8B6F;

  /* Secondary Accent (Navy) */
  --accent-secondary: #1E3557;
  --accent-secondary-alt: #243B5A;

  /* Text */
  --text-primary: #1C1F23;
  --text-secondary: #6B7280;

  /* Buttons */
  --btn-primary-bg: var(--accent-primary);
  --btn-primary-text: #FFFFFF;
  --btn-secondary-bg: #FFFFFF;
  --btn-secondary-border: var(--accent-secondary);
  --btn-secondary-text: var(--accent-secondary);

  /* Cards */
  --card-border-radius: 4px;
  --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
```

---

## Checklist for Implementation

- [ ] Update all CSS variables to match approved palette
- [ ] Replace "PreSale" with "Private Sale" across all components
- [ ] Remove ICO sale page
- [ ] Remove post-presale dashboard
- [ ] Update buttons to match new style guide
- [ ] Ensure cards have subtle shadows and minimal border-radius
- [ ] Verify charts use navy/green color scheme only
- [ ] Test all pages on light background
