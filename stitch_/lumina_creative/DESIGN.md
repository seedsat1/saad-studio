---
name: Lumina Creative
colors:
  surface: '#0e141c'
  surface-dim: '#0e141c'
  surface-bright: '#343943'
  surface-container-lowest: '#090e17'
  surface-container-low: '#171c24'
  surface-container: '#1b2029'
  surface-container-high: '#252a33'
  surface-container-highest: '#30353e'
  on-surface: '#dee2ef'
  on-surface-variant: '#bcc9cd'
  inverse-surface: '#dee2ef'
  inverse-on-surface: '#2b313a'
  outline: '#869397'
  outline-variant: '#3d494c'
  surface-tint: '#4cd7f6'
  primary: '#4cd7f6'
  on-primary: '#003640'
  primary-container: '#06b6d4'
  on-primary-container: '#00424f'
  inverse-primary: '#00687a'
  secondary: '#d2bbff'
  on-secondary: '#3f008e'
  secondary-container: '#6001d1'
  on-secondary-container: '#c9aeff'
  tertiary: '#ffb873'
  on-tertiary: '#4b2800'
  tertiary-container: '#e89337'
  on-tertiary-container: '#5b3200'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#acedff'
  primary-fixed-dim: '#4cd7f6'
  on-primary-fixed: '#001f26'
  on-primary-fixed-variant: '#004e5c'
  secondary-fixed: '#eaddff'
  secondary-fixed-dim: '#d2bbff'
  on-secondary-fixed: '#25005a'
  on-secondary-fixed-variant: '#5a00c6'
  tertiary-fixed: '#ffdcbf'
  tertiary-fixed-dim: '#ffb873'
  on-tertiary-fixed: '#2d1600'
  on-tertiary-fixed-variant: '#6a3b00'
  background: '#0e141c'
  on-background: '#dee2ef'
  surface-variant: '#30353e'
  canvas-deep: '#02050C'
  canvas-elevated: '#0A0F1A'
  text-primary: '#FFFFFF'
  text-secondary: '#E2E8F0'
  accent-cyan: '#06B6D4'
  accent-violet: '#7C3AED'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Outfit
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Outfit
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 64px
  gutter: 16px
  margin-mobile: 20px
  margin-tablet: 32px
---

## Brand & Style

The design system is engineered for a high-end creative agency context, emphasizing a **Minimalist-Modern** aesthetic with a strong **Dark Mode** foundation. The brand personality is sophisticated, forward-thinking, and precise. 

The visual strategy relies on the interplay between deep nocturnal backgrounds and vibrant, neon-inflected accents. It avoids decorative clutter in favor of generous whitespace (or "dark space") and razor-sharp typography. Every element should feel intentional and premium, utilizing smooth motion and high-quality imagery to evoke an emotional response of trust and awe. 

Key design pillars:
- **Presence through Absence:** Use negative space to focus attention on portfolio work.
- **Vibrant Precision:** Use high-saturation accents sparingly against the dark void.
- **Editorial Polish:** High-contrast typography scales that feel curated and authoritative.

## Colors

The palette is anchored by **Canvas Deep (#02050C)**, a near-black that provides infinite depth. This is contrasted with **Text Primary (#FFFFFF)** for maximum legibility. 

- **Primary (Cyan):** Used for primary actions, active states, and highlighting key creative metrics.
- **Secondary (Violet):** Used for secondary interactions, gradients, and brand-heavy moments.
- **Surface Strategy:** Use subtle shifts from Deep to Elevated (#0A0F1A) to define hierarchy without needing heavy borders.
- **RTL Considerations:** Color-coded status indicators and iconography must maintain consistent semantic meaning when mirrored.

## Typography

The design system utilizes **Outfit** for its geometric clarity and modern professional feel. It is highly legible and scales beautifully from massive display headers to micro-labels.

**Arabic Support (RTL):**
- Ensure the selected weights are preserved in the Arabic typeface.
- Maintain a line-height multiplier of approximately 1.4x - 1.6x for Arabic text to prevent vowel mark clipping.
- Text alignment must be strictly right-aligned for all body and headline copy.
- Letter spacing should be reset to `0` for Arabic scripts as tracking disrupts cursive connections.

## Layout & Spacing

This design system uses a **Fluid Grid** model based on a 4px baseline unit. 

- **Mobile:** 4-column grid with 20px side margins and 16px gutters.
- **Tablet:** 8-column grid with 32px side margins.
- **RTL Reflow:** All layouts must flip horizontally. Icons that indicate direction (arrows, back buttons) must be mirrored, while brand marks and non-directional icons (search, settings) remain static.
- **Spacing Rhythm:** Use "Extra Large" (40px+) spacing between major sections to emphasize the minimalist agency aesthetic.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layers** and **Glassmorphism**, avoiding traditional heavy shadows which can muddy a dark interface.

1.  **Base Layer:** Canvas Deep (#02050C).
2.  **Raised Layer:** Canvas Elevated (#0A0F1A) with a subtle 1px border (#FFFFFF 10% opacity).
3.  **Floating Elements:** Use a Backdrop Blur (20px) with 60% opacity on the surface color to create a "frosted" look for navigation bars and modals.
4.  **Glow Effects:** Critical CTAs may use a soft, diffused outer glow using the primary cyan color (spread 20px, opacity 15%) to simulate light emission.

## Shapes

The design system employs a **Rounded** shape language (8px base radius). This strikes a balance between the precision of hard edges and the approachability of rounded corners.

- **Primary Buttons:** 8px (rounded-md) for a professional look.
- **Cards & Modals:** 16px (rounded-lg) to provide a soft container for imagery.
- **Interactive Inputs:** 8px (rounded-md) to match button profiles.
- **Media:** Portfolio thumbnails should strictly follow the 16px radius to maintain a high-end, modern look.

## Components

### Buttons
- **Primary:** Solid Cyan (#06B6D4) with Dark (#02050C) text. High contrast, no shadow.
- **Secondary:** Ghost style with a 1px Violet (#7C3AED) border and white text.
- **Tertiary:** Text-only with an underline on hover/active states.

### Cards
- Use "Canvas Elevated" background. 
- 1px stroke (#FFFFFF at 10% opacity) for definition.
- Imagery should fill the top half of the card with no internal padding.

### Input Fields
- Dark backgrounds with a subtle bottom-border-only focus state in Cyan.
- Labels must be right-aligned above the field for RTL support.

### Lists & Navigation
- Horizontal scrolling for categories should have the "fade to black" gradient on the left side (in RTL) to indicate more content.
- Bottom navigation should use a glassmorphic background with blurred content behind it.

### Specialized Components
- **Case Study Header:** Full-bleed imagery with a Secondary-to-Transparent gradient overlay to ensure text legibility.
- **Progressive Disclosure:** Use smooth height-transitioning accordions for FAQ or service details.