# MTN Group – Brand Design System
> Reference guide for Claude Code: colours, typography, buttons, components, and UI patterns.

---

## 1. Colour Palette

### Primary
| Name | Hex | Usage |
|---|---|---|
| MTN Yellow (Y'ello) | `#FFCB00` | Primary brand colour, CTAs, highlights, icons |
| MTN Navy | `#002868` | Headings, corporate text, dark backgrounds |
| Black | `#000000` | Body text, borders |
| White | `#FFFFFF` | Backgrounds, reversed text |

### Extended / UI Colours
| Name | Hex | Usage |
|---|---|---|
| Dark Charcoal | `#1A1A1A` | Page/section dark backgrounds |
| Light Grey | `#F5F5F5` | Card backgrounds, subtle fills |
| Mid Grey | `#CCCCCC` | Borders, dividers, disabled states |
| Text Grey | `#666666` | Secondary/supporting body text |
| Error Red | `#D0021B` | Form validation errors |
| Success Green | `#2D9C45` | Confirmation / success states |

### CSS Custom Properties (use these in all projects)
```css
:root {
  --mtn-yellow:      #FFCB00;
  --mtn-navy:        #002868;
  --mtn-black:       #000000;
  --mtn-white:       #FFFFFF;
  --mtn-charcoal:    #1A1A1A;
  --mtn-grey-light:  #F5F5F5;
  --mtn-grey-mid:    #CCCCCC;
  --mtn-grey-text:   #666666;
  --mtn-error:       #D0021B;
  --mtn-success:     #2D9C45;
}
```

---

## 2. Typography

### Font Stack
```css
font-family: 'MTN Brighter Sans', 'Neue Haas Grotesk', 'Helvetica Neue', Arial, sans-serif;
```
> If MTN's custom font is unavailable, fall back to `Helvetica Neue` or `Inter`.

### Type Scale
| Role | Size | Weight | Line Height | Colour |
|---|---|---|---|---|
| H1 – Hero | 56px / 3.5rem | 700 Bold | 1.1 | `--mtn-navy` or `--mtn-white` |
| H2 – Section | 40px / 2.5rem | 700 Bold | 1.2 | `--mtn-navy` |
| H3 – Card Title | 28px / 1.75rem | 600 SemiBold | 1.3 | `--mtn-navy` |
| H4 – Sub-heading | 20px / 1.25rem | 600 SemiBold | 1.4 | `--mtn-navy` |
| Body Large | 18px / 1.125rem | 400 Regular | 1.6 | `--mtn-black` |
| Body Default | 16px / 1rem | 400 Regular | 1.6 | `--mtn-black` |
| Body Small | 14px / 0.875rem | 400 Regular | 1.5 | `--mtn-grey-text` |
| Caption / Label | 12px / 0.75rem | 500 Medium | 1.4 | `--mtn-grey-text` |

### CSS Example
```css
h1 {
  font-size: 3.5rem;
  font-weight: 700;
  color: var(--mtn-navy);
  line-height: 1.1;
  letter-spacing: -0.5px;
}

body {
  font-size: 1rem;
  font-weight: 400;
  color: var(--mtn-black);
  line-height: 1.6;
}
```

---

## 3. Buttons

### Rules
- Always use `border-radius: 4px` (slight rounding, not pill-shaped)
- Minimum touch target: `44px` height
- Use `font-weight: 600` and `text-transform: uppercase` for button labels
- Never use yellow text on white background (insufficient contrast)
- Icons in buttons should sit to the left of the label with `8px` gap

### 3.1 Primary Button (Yellow CTA)
```css
.btn-primary {
  background-color: var(--mtn-yellow);
  color: var(--mtn-black);
  border: 2px solid var(--mtn-yellow);
  border-radius: 4px;
  padding: 12px 28px;
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary:hover {
  background-color: #e6b800; /* darkened yellow */
  border-color: #e6b800;
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary:disabled {
  background-color: var(--mtn-grey-mid);
  border-color: var(--mtn-grey-mid);
  color: var(--mtn-grey-text);
  cursor: not-allowed;
}
```

### 3.2 Secondary Button (Navy Outline)
```css
.btn-secondary {
  background-color: transparent;
  color: var(--mtn-navy);
  border: 2px solid var(--mtn-navy);
  border-radius: 4px;
  padding: 12px 28px;
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.btn-secondary:hover {
  background-color: var(--mtn-navy);
  color: var(--mtn-white);
}

.btn-secondary:disabled {
  border-color: var(--mtn-grey-mid);
  color: var(--mtn-grey-mid);
  cursor: not-allowed;
}
```

### 3.3 Ghost / Text Button (on Dark Backgrounds)
```css
.btn-ghost {
  background-color: transparent;
  color: var(--mtn-yellow);
  border: 2px solid var(--mtn-yellow);
  border-radius: 4px;
  padding: 12px 28px;
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.btn-ghost:hover {
  background-color: var(--mtn-yellow);
  color: var(--mtn-black);
}
```

### 3.4 Danger Button
```css
.btn-danger {
  background-color: var(--mtn-error);
  color: var(--mtn-white);
  border: 2px solid var(--mtn-error);
  border-radius: 4px;
  padding: 12px 28px;
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
}

.btn-danger:hover {
  background-color: #b00218;
  border-color: #b00218;
}
```

### 3.5 Button Sizes
```css
.btn-sm  { padding: 8px 18px;  font-size: 0.875rem; }
.btn-md  { padding: 12px 28px; font-size: 1rem; }      /* default */
.btn-lg  { padding: 16px 36px; font-size: 1.125rem; }
```

---

## 4. Form Elements

### Input / Text Field
```css
.input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--mtn-grey-mid);
  border-radius: 4px;
  font-size: 1rem;
  color: var(--mtn-black);
  background-color: var(--mtn-white);
  transition: border-color 0.2s ease;
  outline: none;
}

.input:focus {
  border-color: var(--mtn-yellow);
  box-shadow: 0 0 0 3px rgba(255, 203, 0, 0.25);
}

.input.error {
  border-color: var(--mtn-error);
}

.input:disabled {
  background-color: var(--mtn-grey-light);
  cursor: not-allowed;
}
```

### Label
```css
label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--mtn-navy);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
```

### Select Dropdown
```css
.select {
  /* same as .input */
  appearance: none;
  background-image: url("data:image/svg+xml,..."); /* chevron icon */
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 40px;
}
```

### Checkbox & Radio
```css
input[type="checkbox"],
input[type="radio"] {
  accent-color: var(--mtn-yellow);
  width: 18px;
  height: 18px;
  cursor: pointer;
}
```

---

## 5. Cards

```css
.card {
  background-color: var(--mtn-white);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.card:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.14);
  transform: translateY(-2px);
}

.card-header {
  padding: 20px 24px 0;
}

.card-body {
  padding: 16px 24px;
}

.card-footer {
  padding: 0 24px 20px;
  border-top: 1px solid var(--mtn-grey-light);
  margin-top: 16px;
  padding-top: 16px;
}

/* Yellow accent card variant */
.card-accent {
  border-top: 4px solid var(--mtn-yellow);
}

/* Dark card variant */
.card-dark {
  background-color: var(--mtn-navy);
  color: var(--mtn-white);
}
```

---

## 6. Navigation

```css
.navbar {
  background-color: var(--mtn-white);
  border-bottom: 3px solid var(--mtn-yellow);
  padding: 0 24px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.nav-link {
  color: var(--mtn-navy);
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  text-decoration: none;
  letter-spacing: 0.4px;
  padding: 8px 12px;
  transition: color 0.2s ease;
}

.nav-link:hover,
.nav-link.active {
  color: var(--mtn-yellow);
}

/* Dark navbar variant */
.navbar-dark {
  background-color: var(--mtn-navy);
}

.navbar-dark .nav-link {
  color: var(--mtn-white);
}

.navbar-dark .nav-link:hover {
  color: var(--mtn-yellow);
}
```

---

## 7. Badges & Tags

```css
.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.badge-yellow  { background-color: var(--mtn-yellow);     color: var(--mtn-black); }
.badge-navy    { background-color: var(--mtn-navy);       color: var(--mtn-white); }
.badge-success { background-color: var(--mtn-success);    color: var(--mtn-white); }
.badge-error   { background-color: var(--mtn-error);      color: var(--mtn-white); }
.badge-grey    { background-color: var(--mtn-grey-light); color: var(--mtn-grey-text); }
```

---

## 8. Alerts & Notifications

```css
.alert {
  padding: 14px 18px;
  border-radius: 4px;
  border-left: 4px solid;
  font-size: 0.95rem;
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.alert-info    { background-color: #EEF3FF; border-color: var(--mtn-navy);   color: var(--mtn-navy); }
.alert-warning { background-color: #FFFBE6; border-color: var(--mtn-yellow); color: #7A6000; }
.alert-error   { background-color: #FFF0F0; border-color: var(--mtn-error);  color: var(--mtn-error); }
.alert-success { background-color: #F0FAF2; border-color: var(--mtn-success);color: #1A6B2E; }
```

---

## 9. Spacing System

Based on a **4px base unit**:

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Micro gaps |
| `--space-2` | 8px | Tight spacing (icon gaps) |
| `--space-3` | 12px | Small padding |
| `--space-4` | 16px | Default component padding |
| `--space-5` | 24px | Card padding, section gaps |
| `--space-6` | 32px | Medium sections |
| `--space-7` | 48px | Large sections |
| `--space-8` | 64px | Hero/page sections |
| `--space-9` | 96px | Major page sections |

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --space-9: 96px;
}
```

---

## 10. Shadows & Elevation

```css
:root {
  --shadow-sm:  0 1px 4px rgba(0,0,0,0.08);
  --shadow-md:  0 2px 12px rgba(0,0,0,0.10);
  --shadow-lg:  0 6px 24px rgba(0,0,0,0.14);
  --shadow-xl:  0 12px 40px rgba(0,0,0,0.18);
}
```

---

## 11. Border Radius

```css
:root {
  --radius-sm:  2px;   /* subtle */
  --radius-md:  4px;   /* buttons, inputs, cards (MTN default) */
  --radius-lg:  8px;   /* cards, modals */
  --radius-xl:  16px;  /* large panels */
  --radius-pill: 999px; /* pills/tags */
}
```

---

## 12. Logo Usage Rules

- **Primary logo**: Yellow triangle + "MTN" wordmark in black — use on white/light backgrounds
- **Reversed logo**: White triangle + "MTN" wordmark in white — use on dark/navy backgrounds
- **Minimum clear space**: Equal to the height of the "M" letterform on all sides
- **Minimum size**: 80px wide for digital use
- **Never**: Stretch, recolour, add drop shadows, or place on a busy photographic background without an overlay
- **Logo file**: SVG preferred; PNG fallback at 2x resolution for raster use

---

## 13. Iconography

- Use **line icons** (stroke weight: 2px) in default states
- Use **filled icons** for active/selected states
- Icon colour: `var(--mtn-navy)` on light backgrounds; `var(--mtn-yellow)` or `var(--mtn-white)` on dark backgrounds
- Standard icon sizes: `16px`, `20px`, `24px`, `32px`
- Recommended icon library: [Lucide Icons](https://lucide.dev) or [Phosphor Icons](https://phosphoricons.com)

---

## 14. Dark Section Pattern

Used in hero banners and featured sections:

```css
.section-dark {
  background-color: var(--mtn-navy);
  color: var(--mtn-white);
  padding: var(--space-9) var(--space-5);
}

.section-dark h1,
.section-dark h2,
.section-dark h3 {
  color: var(--mtn-white);
}

.section-dark .highlight {
  color: var(--mtn-yellow);
}
```

---

## 15. Quick Reference Cheatsheet

```
PRIMARY YELLOW:   #FFCB00  → CTAs, highlights, brand moments
CORPORATE NAVY:   #002868  → Headings, backgrounds, formal text
BLACK:            #000000  → Body text
WHITE:            #FFFFFF  → Backgrounds, reversed elements

BUTTON PRIMARY:   Yellow bg  + Black text  + 4px radius
BUTTON SECONDARY: Transparent + Navy border + Navy text
BUTTON GHOST:     Transparent + Yellow border + Yellow text (dark bg only)

FONT:             Bold geometric sans-serif | UPPERCASE for labels/buttons
BORDER RADIUS:    4px default
BORDER HIGHLIGHT: 3px yellow bottom-border on navbar
CARD ACCENT:      4px yellow top-border
```

---


---

## 16. App Shell Layout & Light / Dark Mode

> This section defines the **structural layout** for all MTN web apps and portals: a fixed left sidebar with the MTN logo, a white (light) or dark main content area, and a switchable light/dark mode token system. No dashboard-specific widgets are defined here — this is purely the shell and theming layer.

---

### 16.1 Theming Philosophy

MTN apps use a **CSS custom property token system** for theming. The `:root` defines light mode. The `[data-theme="dark"]` attribute on `<html>` or `<body>` overrides every token to its dark equivalent. A single toggle class/attribute swap is all that is needed — no component-level changes required.

The **sidebar is always MTN Navy (`#002868`)** regardless of light or dark mode. It is the brand anchor. Only the main content area and top bar switch between light and dark.

---

### 16.2 Theme Tokens

```css
/* ─── Brand constants (never change between themes) ─── */
:root {
  --mtn-yellow:       #FFCB00;
  --mtn-navy:         #002868;
  --mtn-navy-dark:    #001844;  /* deeper navy for hover states */
  --mtn-yellow-hover: #E6B800;
}

/* ─── LIGHT MODE (default) ─── */
:root {
  --bg-app:           #F0F2F5;   /* outer app background */
  --bg-surface:       #FFFFFF;   /* cards, panels, main content */
  --bg-surface-2:     #F5F6F8;   /* subtle nested surfaces */
  --bg-hover:         #F0F2F5;   /* hover on interactive items */

  --text-primary:     #0D1117;   /* headings, strong labels */
  --text-secondary:   #4B5563;   /* body, descriptions */
  --text-muted:       #9CA3AF;   /* placeholders, captions */
  --text-inverse:     #FFFFFF;   /* text on dark/navy surfaces */

  --border-default:   #E5E7EB;   /* dividers, card borders */
  --border-strong:    #D1D5DB;   /* input borders */
  --border-focus:     #FFCB00;   /* focus ring — always yellow */

  --shadow-card:      0 1px 4px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04);
  --shadow-elevated:  0 4px 16px rgba(0,0,0,0.10);

  --topbar-bg:        #FFFFFF;
  --topbar-border:    #E5E7EB;
  --topbar-text:      #0D1117;
  --topbar-icon:      #6B7280;
}

/* ─── DARK MODE ─── */
[data-theme="dark"] {
  --bg-app:           #0D1117;
  --bg-surface:       #161B22;
  --bg-surface-2:     #21262D;
  --bg-hover:         #21262D;

  --text-primary:     #F0F6FC;
  --text-secondary:   #8B949E;
  --text-muted:       #484F58;
  --text-inverse:     #0D1117;

  --border-default:   #30363D;
  --border-strong:    #484F58;
  --border-focus:     #FFCB00;

  --shadow-card:      0 1px 4px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2);
  --shadow-elevated:  0 4px 16px rgba(0,0,0,0.4);

  --topbar-bg:        #161B22;
  --topbar-border:    #30363D;
  --topbar-text:      #F0F6FC;
  --topbar-icon:      #8B949E;
}
```

---

### 16.3 App Shell Structure

```
┌──────────────────────────────────────────────────┐
│  TOP BAR  (white / dark)              height: 56px│
├────────────────┬─────────────────────────────────┤
│                │                                  │
│  LEFT SIDEBAR  │   MAIN CONTENT AREA              │
│  (always navy) │   (white in light / dark in dark)│
│  width: 220px  │                                  │
│                │                                  │
└────────────────┴─────────────────────────────────┘
```

```css
/* Shell reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  font-family: 'MTN Brighter Sans', 'Helvetica Neue', Arial, sans-serif;
  background-color: var(--bg-app);
  color: var(--text-primary);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  background-color: var(--bg-surface);
  padding: 32px;
  transition: background-color 0.2s ease;
}
```

---

### 16.4 Top Bar

The top bar is white in light mode and dark in dark mode. It always has a subtle bottom border — **never** a yellow border (yellow is reserved for the sidebar active indicator and focus rings).

```css
.top-bar {
  height: 56px;
  background-color: var(--topbar-bg);
  border-bottom: 1px solid var(--topbar-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  z-index: 200;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

/* Right side: icon actions (theme toggle, notifications, avatar) */
.top-bar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.top-bar-icon-btn {
  background: none;
  border: none;
  color: var(--topbar-icon);
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s, color 0.15s;
}

.top-bar-icon-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

/* Theme toggle button — highlight when in dark mode */
[data-theme="dark"] .theme-toggle-btn {
  color: var(--mtn-yellow);
}
```

---

### 16.5 Left Sidebar (always navy)

The sidebar is **always `--mtn-navy`** — it does not change between light and dark mode. It serves as the permanent brand anchor.

```css
.sidebar {
  width: 220px;
  min-width: 220px;
  background-color: var(--mtn-navy);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
}

/* ── Logo area ── */
.sidebar-logo {
  height: 56px;                        /* aligns with top bar */
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}

.sidebar-logo img {
  height: 28px;
  width: auto;
}

/* If text label alongside logo */
.sidebar-logo-text {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255,255,255,0.6);
  line-height: 1.2;
}

/* ── Section group labels ── */
.sidebar-group-label {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: rgba(255,255,255,0.35);
  padding: 20px 16px 5px;
}

/* ── Nav items ── */
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px 9px 16px;
  margin: 1px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 400;
  color: rgba(255,255,255,0.65);
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  white-space: nowrap;
}

.sidebar-item:hover {
  background-color: rgba(255,255,255,0.07);
  color: #FFFFFF;
}

/* Active state — yellow left accent */
.sidebar-item.active {
  background-color: rgba(255, 203, 0, 0.10);
  color: var(--mtn-yellow);
  font-weight: 600;
  border-left: 3px solid var(--mtn-yellow);
  padding-left: 13px;  /* compensate for border width */
}

.sidebar-item .nav-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.7;
}

.sidebar-item.active .nav-icon,
.sidebar-item:hover .nav-icon {
  opacity: 1;
}

/* ── Footer / version ── */
.sidebar-footer {
  margin-top: auto;
  padding: 12px 16px;
  font-size: 0.7rem;
  color: rgba(255,255,255,0.25);
  border-top: 1px solid rgba(255,255,255,0.06);
}
```

---

### 16.6 Light / Dark Mode Toggle

Use a button in the top bar to toggle `data-theme` on `<html>`. Persist preference in `localStorage`.

```js
// theme-toggle.js
const root = document.documentElement;
const STORAGE_KEY = 'mtn-theme';

function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEY)
    || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
  // Update toggle button icon
  const btn = document.querySelector('.theme-toggle-btn');
  if (btn) btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

function toggleTheme() {
  const current = root.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// Initialise on page load
applyTheme(getStoredTheme());

document.querySelector('.theme-toggle-btn')
  ?.addEventListener('click', toggleTheme);
```

**Button HTML** (place in `.top-bar-actions`):
```html
<button class="top-bar-icon-btn theme-toggle-btn" aria-label="Switch to dark mode">
  <!-- Sun icon for dark mode (click to go light) -->
  <!-- Moon icon for light mode (click to go dark) -->
  ☀ <!-- swap to 🌙 via JS or CSS [data-theme] selector -->
</button>
```

**CSS icon swap via attribute:**
```css
.theme-toggle-btn::before { content: '🌙'; }
[data-theme="dark"] .theme-toggle-btn::before { content: '☀'; }
```

---

### 16.7 Full Shell HTML Skeleton

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MTN App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>

<div class="app-shell">

  <!-- ── TOP BAR ── -->
  <header class="top-bar">
    <!-- Left: breadcrumb / page context (optional) -->
    <div class="top-bar-left">
      <!-- e.g. hamburger for mobile -->
    </div>

    <!-- Right: global actions -->
    <div class="top-bar-actions">
      <button class="top-bar-icon-btn theme-toggle-btn" aria-label="Toggle theme"></button>
      <!-- notifications, avatar, etc. -->
    </div>
  </header>

  <div class="app-body">

    <!-- ── LEFT SIDEBAR (always navy) ── -->
    <nav class="sidebar">

      <!-- Logo — sits at same height as top bar -->
      <div class="sidebar-logo">
        <img src="/assets/mtn-logo-white.svg" alt="MTN">
        <!-- Optional app sub-label -->
        <!-- <span class="sidebar-logo-text">Portal Name</span> -->
      </div>

      <!-- Nav groups -->
      <div class="sidebar-group-label">Main</div>
      <a class="sidebar-item active" href="/dashboard">
        <span class="nav-icon">⊞</span> Dashboard
      </a>
      <a class="sidebar-item" href="/reports">
        <span class="nav-icon">📊</span> Reports
      </a>

      <!-- Add more groups + items as needed -->

      <div class="sidebar-footer">MTN Portal v1.0</div>
    </nav>

    <!-- ── MAIN CONTENT ── -->
    <main class="main-content">
      <!-- Page content goes here -->
      <!-- Background is white (light) or #161B22 (dark) via CSS token -->
    </main>

  </div>
</div>

<script src="theme-toggle.js"></script>
</body>
</html>
```

---

### 16.8 Theme Token Summary

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--bg-app` | `#F0F2F5` | `#0D1117` | Outer app wrapper |
| `--bg-surface` | `#FFFFFF` | `#161B22` | Main content, cards |
| `--bg-surface-2` | `#F5F6F8` | `#21262D` | Nested panels |
| `--bg-hover` | `#F0F2F5` | `#21262D` | Hover states |
| `--text-primary` | `#0D1117` | `#F0F6FC` | Headings, strong text |
| `--text-secondary` | `#4B5563` | `#8B949E` | Body copy |
| `--text-muted` | `#9CA3AF` | `#484F58` | Placeholders, captions |
| `--border-default` | `#E5E7EB` | `#30363D` | Dividers |
| `--border-focus` | `#FFCB00` | `#FFCB00` | Always yellow |
| `--topbar-bg` | `#FFFFFF` | `#161B22` | Top bar |
| `--topbar-border` | `#E5E7EB` | `#30363D` | Top bar underline |
| Sidebar bg | `#002868` | `#002868` | **Never changes** |
| Active nav item | `#FFCB00` text + border | `#FFCB00` text + border | **Never changes** |

---

### 16.9 Sidebar Collapsed State (responsive)

```css
/* Collapsed: icon-only at 60px */
.sidebar.collapsed {
  width: 60px;
  min-width: 60px;
}

.sidebar.collapsed .sidebar-group-label,
.sidebar.collapsed .sidebar-logo-text,
.sidebar.collapsed .sidebar-footer,
.sidebar.collapsed .sidebar-item span:not(.nav-icon) {
  display: none;
}

.sidebar.collapsed .sidebar-item {
  justify-content: center;
  padding: 10px;
  margin: 1px 6px;
}

.sidebar.collapsed .sidebar-logo {
  justify-content: center;
  padding: 0;
}

/* Mobile: hide entirely, show via overlay */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -220px;
    top: 0;
    height: 100%;
    z-index: 300;
    transition: left 0.25s ease;
  }

  .sidebar.open {
    left: 0;
    box-shadow: 4px 0 24px rgba(0,0,0,0.3);
  }
}
```

---

*Last updated: February 2026 | Source: mtn.com brand audit*
