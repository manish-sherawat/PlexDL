# Awesome Downloader - Titanium Frosted Glass Design Specification

## 1. Executive Summary & Aesthetic Vision

**Awesome Downloader** is evolving from a 2000s Win32 IDM-inspired legacy interface into **Titanium Frosted Glass**: an ultra-refined, minimalist, high-craft desktop experience.

The design philosophy is informed by the precision engineering of **macOS Sequoia, Apple VisionOS, Linear, and Vercel**:
- **Pure Monochromatic Depth:** Deep obsidian, graphite, and titanium slate surfaces.
- **True Frosted Glassmorphism:** Translucent multi-tier surfaces with physically modeled ambient light refraction (`backdrop-filter: blur(...)`), hairline specular rim lighting, and subtle ambient shadows.
- **Surgical Typography:** Crisp optical sizing, generous line rhythm, and tabular figures for all real-time metrics.
- **Strict Visual Restraint:**
  - **NO purple gradients, magenta meshes, or violet fills.**
  - **NO neon glows, cyberpunk RGB lighting, or oversaturated gamer accents.**
  - **NO archaic Win32 skeuomorphism (no bevels, 3D relief buttons, or yellow folder pixel-art).**

---

## 2. Design System Tokens (`:root`)

### 2.1 Default Theme: Alabaster Platinum (`:root`, `[data-theme="light"]`)
*Default out-of-the-box appearance — pristine, luminous, high-readability architectural slate.*
```css
/* Base Canvas & Atmosphere */
--bg-canvas: #f8fafc;
--bg-canvas-subtle: #f1f5f9;
--bg-surface-glass: rgba(255, 255, 255, 0.82);
--bg-surface-glass-hover: rgba(241, 245, 249, 0.90);
--bg-surface-elevated: rgba(255, 255, 255, 0.96);
--bg-surface-card: rgba(0, 0, 0, 0.035);
--bg-input: #ffffff;

/* Specular Rim Highlights */
--border-subtle: rgba(0, 0, 0, 0.07);
--border-glass: rgba(0, 0, 0, 0.12);
--border-specular: rgba(0, 0, 0, 0.18);
--border-active: rgba(2, 132, 199, 0.60);

/* Typography Colors */
--text-primary: #0f172a;
--text-secondary: #475569;
--text-tertiary: #94a3b8;
--text-inverse: #ffffff;

/* Restrained Semantic Accents */
--accent-primary: #0284c7;         /* Ocean Cyan-Blue */
--accent-primary-hover: #0369a1;
--accent-primary-glass: rgba(2, 132, 199, 0.10);
--accent-success: #059669;         /* Fresh Emerald */
--accent-success-glass: rgba(5, 150, 105, 0.10);
--accent-warning: #d97706;         /* Polished Amber */
--accent-warning-glass: rgba(217, 119, 6, 0.10);
--accent-danger: #dc2626;          /* Deep Crimson */
--accent-danger-glass: rgba(220, 38, 38, 0.10);
```

### 2.2 Enriched Dark Palette: Sapphire Obsidian (`[data-theme="dark"]`)
*Upgraded deep obsidian with refined midnight sapphire depth, elevated cards, and luminous ice cerulean accents — zero purple, zero neon, pure optical craft.*
```css
/* Base Canvas & Atmosphere */
--bg-canvas: #0a0d14;              /* Deep Sapphire Obsidian */
--bg-canvas-subtle: #0f1523;       /* Elevated Midnight Slate */
--bg-surface-glass: rgba(16, 24, 40, 0.76); /* Frosted Sapphire Glass */
--bg-surface-glass-hover: rgba(26, 38, 62, 0.65);
--bg-surface-elevated: rgba(18, 27, 46, 0.94);
--bg-surface-card: rgba(255, 255, 255, 0.045);
--bg-surface-card-hover: rgba(56, 189, 248, 0.08);
--bg-input: rgba(8, 12, 20, 0.85);

/* Specular Rim Highlights */
--border-subtle: rgba(255, 255, 255, 0.07);
--border-glass: rgba(255, 255, 255, 0.12);
--border-specular: rgba(255, 255, 255, 0.20);
--border-active: rgba(56, 189, 248, 0.55);

/* Typography Colors */
--text-primary: #f8fafc;
--text-secondary: #94a3b8;
--text-tertiary: #64748b;
--text-inverse: #020617;

/* Restrained Semantic Accents */
--accent-primary: #38bdf8;         /* Luminous Ice Cerulean */
--accent-primary-hover: #7dd3fc;
--accent-primary-glass: rgba(56, 189, 248, 0.14);
--accent-success: #34d399;         /* Alpine Mint: Completed */
--accent-success-glass: rgba(52, 211, 153, 0.14);
--accent-warning: #fbbf24;         /* Titanium Amber: Paused / Queued */
--accent-warning-glass: rgba(251, 191, 36, 0.14);
--accent-danger: #f87171;          /* Subdued Crimson: Errors */
--accent-danger-glass: rgba(248, 113, 113, 0.14);
```

### 2.2 Glass Elevation Layers
1. **Layer 0 (Canvas):** Deep Obsidian `#090b0e` with ambient subtle radial light.
2. **Layer 1 (Sidebar & Table Base):** `rgba(18, 22, 29, 0.65)` with `backdrop-filter: blur(20px) saturate(160%)` and `border: 1px solid rgba(255, 255, 255, 0.06)`.
3. **Layer 2 (Floating Action Toolbar & Controls):** `rgba(24, 29, 38, 0.75)` with `box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.10)`.
4. **Layer 3 (Modals, Popovers, Choosers):** `rgba(22, 27, 36, 0.90)` with `backdrop-filter: blur(36px) saturate(180%)` and deep ambient shadow `0 24px 64px rgba(0, 0, 0, 0.65)`.

### 2.3 Typography Scale
- **Font Stack:**
  - Standard: `"Segoe UI Variable Text", -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif`
  - Monospace / Numeric: `"SF Mono", "Segoe UI Variable Text", "Cascadia Code", "JetBrains Mono", monospace` with `font-variant-numeric: tabular-nums lining-nums`
- **Scale:**
  - Modal Title: `16px / 600 weight / -0.015em tracking`
  - Section Heading: `11px / 600 weight / uppercase / +0.06em tracking`
  - Table Primary Name: `13px / 500 weight / normal`
  - Table Numerical Metrics: `12px / 400 weight / tabular-nums`
  - Micro Status Pills: `11px / 600 weight`

---

## 3. Component Architecture Specifications

### 3.1 Floating Action Island (Top Toolbar)
- Streamlined 50px frosted container replacing the archaic 70px Win32 bar.
- Rounded pill buttons (`border-radius: 6px`) with 15×15px minimalist stroke icons.
- Primary CTA (`Add URL`) features a luminous silver-slate glass treatment (`rgba(255, 255, 255, 0.12)`) with an inner top rim highlight.

### 3.2 Translucent Category Navigation (Sidebar)
- 210px width with comfortable 8px breathing margins.
- Clean category list (Images, Video, Audio, Archives, Documents, Programs, Other, Unfinished, Finished, Queues).
- Replaces CSS-drawn yellow manila folders and Unicode characters with crisp SVG line icons.
- Active category has an inset frosted indicator (`background: rgba(56, 189, 248, 0.10); border: 1px solid rgba(56, 189, 248, 0.22); color: #38bdf8;`).

### 3.3 Borderless Minimalist Downloads Table
- No solid interior cage borders ("prison bars").
- Sticky header with 34px height, uppercase micro-labels, and subtle glass background.
- Row height: 40px with generous 12px horizontal padding.
- Micro-progress tracks: Sleek 4px pill tracks integrated into progress cells.
- Status pills: Muted pill containers with dot indicators (e.g. `● Complete` in Alpine Mint, `● Downloading` in Ice Blue).

### 3.4 Floating Modals & Dialogue Windows
- Modal backdrop: `rgba(3, 5, 8, 0.70)` with `backdrop-filter: blur(12px)`.
- Modal surface: `border-radius: 14px`, `box-shadow: 0 32px 80px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.15)`.
- Form inputs: Inset dark wells with `border: 1px solid rgba(255, 255, 255, 0.08)` and crisp focus rings.
- Segmented tabs: Capsule control group with sliding frosted selection indicator.

### 3.5 Multi-Connection Segment Matrix Visualizer
- In Download Properties, replaces clunky HTML `<progress>` strips with a high-density, responsive 8-to-32 connection segment matrix.
- Chunks render as sleek pill bars with smooth width transitions and tabular per-connection speed displays.

### 3.6 GitHub-Style Activity Matrix Progress System
- **Contribution Matrix Layout:** In the Download Properties / Progress view, the traditional linear progress bar is replaced by a 100-cell GitHub contribution activity grid (4 rows × 25 columns).
- **Column-Major Percentage Mapping:** With `grid-auto-flow: column`, box index `0..99` maps directly to download completion percentage `0%..100%`, advancing gracefully column by column from left to right.
- **Authentic Dual-Palette Tokens:**
  - *Light Mode (Alabaster Platinum):* Level-0 empty `#ebedf0`, Level-1 `#9be9a8`, Level-2 `#40c463`, Level-3 `#30a14e`, Level-4 `#216e39`.
  - *Dark Mode (Sapphire Obsidian):* Level-0 empty `#161b22`, Level-1 `#0e4429`, Level-2 `#006d32`, Level-3 `#26a641`, Level-4 `#39d353`.
- **Parallel Segment Chunk Awareness:** Active connections dynamically illuminate their respective byte-range boxes with active breathing keyframes (`is-active`), visualizing concurrent multi-threaded segment downloads in real-time.
- **Dynamic Streaming Wave:** For live streams or downloads without `Content-Length`, an undulating wave sweeps across the 100-box grid (`is-streaming`).
- **Muted & Error Resiliency:** Paused transfers turn subtle zinc (`is-paused`), while errors display clear crimson blocks (`is-error`).
- **Mini-Track Status Badge:** In the main downloads table, each active item displays a compact 5-box miniature GitHub track (`.mini-gh-track`) embedded in the status cell for unified visual hierarchy.
- **Backwards Compatibility:** Native `#detail-progress` is preserved hidden in the DOM and kept synchronized in value/attributes for accessibility and test suites.

---

## 4. Accessibility & Micro-Interactions
- Full WCAG AA contrast ratio compliance (>4.5:1 for body text, >3:1 for UI elements).
- Subdued, non-distracting 140ms ease-out transitions on all interactive states.
- High-DPI crisp vector rendering for all icons and controls.

---

## 5. Comprehensive Responsive Architecture

The entire UI is built on a fluid, multi-breakpoint responsive grid supporting everything from compact 380px snapped window tiles to 4K desktop displays.

### 5.1 Breakpoint Strategy
- **Wide & Standard Desktop (> 1100px):** Full layout with 200px category sidebar, complete toolbar with descriptive text labels, and all 8 data columns in the downloads table.
- **Medium Screens (<= 1100px):** Secondary toolbar labels collapse (`span { display: none }`); non-essential `Description` column is automatically hidden.
- **Tablet Landscape & Snapped Halves (<= 880px):** All tools collapse to compact icon-only buttons (preserving text on primary `Add URL`); `Last Try / Date` column is hidden; search dock input expands fluidly.
- **Tablet Portrait (<= 768px):** Category sidebar auto-collapses into a sleek 52px icon rail; `Time Left` column hides; name and rate columns scale with fluid percentage weights; toast notifications center across the viewport.
- **Mobile & Narrow Split-View (<= 640px):** Sidebar becomes an off-canvas frosted glass drawer with ambient backdrop blur; dialogs and forms stack inputs vertically with full-width fields and wrapped action buttons.
- **Ultra-Compact (<= 480px):** Compact 44px toolbar with touch-friendly 32px targets; downloads table prioritizes core metrics (`File Name`, `Size`, `Status`, `Transfer Rate`); 100-box GitHub activity matrix dynamically scales to 2px gap and 8px boxes.

### 5.2 Responsive Controls & Micro-Interactions
- **Sidebar Toggle Button:** Top toolbar includes a dedicated `#toggle-sidebar` button with `Alt+B` / `Ctrl+B` keyboard shortcut.
- **Drawer Overlay & Backdrop:** Tapping anywhere outside the drawer closes it smoothly with hardware-accelerated transforms.
- **Fluid Column Resizer:** Column resizing handles respect a 320px minimum fluid table width rather than legacy rigid pixel boundaries.

---

## 6. Complete Layout, Icons, Colors & Design Overhaul

### 6.1 Unified Application Top Header (`.app-header`)
- **Brand Identity:** Modern Prism vector logo, bold "Awesome Downloader" typographic badge, and "Pro" edition chip.
- **Centered Search Pill:** Fluid pill-shaped search input with embedded search glass vector icon, dark inset well, and `Ctrl+F` keyboard shortcut chip.
- **Combined Throughput Meter:** Live `#status-summary` throughput chip with pulsing emerald dot (`is-active`) indicating active multi-connection transfers in real-time.
- **Header Actions:** Quick-access theme toggle (`#theme-toggle`) and primary "+ Add URL" CTA button (`#new-download`).

### 6.2 Lucide-Precision Vector Iconography System
- Standardized 24×24 stroke-based Lucide-precision vector icons across all tool buttons:
  - `add`: Plus vector
  - `resume`: Clean forward triangle
  - `stop`: Vertical pause bars
  - `stopall`: Solid square stop
  - `delete`: Modern wastebasket
  - `clear`: Wastebasket with checkmark
  - `options`: Precision sliders
  - `clock`: Clock face with hands
  - `startqueue`: Double forward chevrons
  - `stopqueue`: Double vertical pause bars
  - `browser`: Globe with latitude/longitude lines
  - `theme`: Split light/dark circle
  - `sidebar`: Panel sidebar toggle icon

### 6.3 Modernized Sidebar Navigation & System Health Card
- **Typographic Grouping:** Clean uppercase section headers ("Smart Views", "Categories") with 0.08em tracking.
- **Dynamic Category Badges:** Real-time numeric badges displaying active items per category and view.
- **System Health Card:** Frosted card at sidebar base displaying live engine state ("Engine Online", "Parallel multi-threaded core") with glowing green status bead.

### 6.4 Subtitled Download Item Hierarchy
- Two-line cell architecture inside the downloads grid:
  - **Primary Title (`.file-title-primary`):** Bold 12.5px filename with ellipsis truncation.
  - **Secondary Domain Subtitle (`.file-domain-sub`):** Monospace 10.5px hostname attribution (e.g., `github.com`, `archive.org`, `releases.ubuntu.com`) extracted cleanly from download URLs.

### 6.5 Interactive Frosted Glass Empty State
- Modern frosted glass card centered on the table canvas:
  - Vector tray illustration with incoming transfer arrow.
  - Clear guidance and instructions for adding links.
  - Interactive "+ Add Download" button linked to `#new-download`.
  - Keyboard shortcut hints: `Ctrl+N` New, `Ctrl+F` Search, `Alt+B` Sidebar.

### 6.6 High-Fidelity Status Bar Footer
- Integrated 28px bottom status dock:
  - Glowing status bead with connection label.
  - Formatted count indicator: active count, total count, and completed count.
  - High-speed transfer mode indicator.

---

## 7. Download Progress Popup Window Redesign & Layout Hierarchy

### 7.1 Visual Layout Rearrangement
The Download Progress Popup Window (`#details-dialog`, supporting both standalone Electron window mode `?progress=<id>` and in-app modal mode) was completely overhauled:
1. **Transfer Hero HUD Card (`.transfer-hero-card`):** Positioned prominently at the top as the primary orientation anchor.
2. **Dual-Layer GitHub Activity Matrix (`#github-progress-panel`):** Continuous micro rail + 100-cell activity grid right below the hero card.
3. **Transfer Action Island (`.transfer-buttons`):** Floating action bar with clear semantic hierarchy.
4. **Key Metrics Grid Dashboard (`#details-content`):** High-density 2-column tabular key-value cards replacing plain text.
5. **Multi-Connection Segment Visualizer (`#connection-details`):** Expandable segment tracks and thread status table.
6. **Celebration Completion Receipt (`.completed-panel`):** Luxury receipt card for finished downloads.

### 7.2 Hero HUD Card (`.transfer-hero-card`)
- **42×42px Glass Icon Frame:** Native or fallback file type icon with soft inset lighting.
- **File Extension Badge (`#detail-hero-ext`):** Uppercase monospace tag pill (`ZIP`, `MP4`, `EXE`, `ISO`, etc.) with theme-adapted tint.
- **Source Domain Chip (`.hero-source-row`):** Monospace URL attribution with a globe vector glyph (`🌐`).
- **Live Throughput Telemetry (`#detail-hero-rate`):** High-precision speed pill with green glowing telemetry beacon (`.telemetry-beacon`) pulsing during active data transfer.
- **Countdown ETA (`#detail-hero-eta`):** Real-time remaining time estimate or finished status.

### 7.3 Dual-Layer Progress Matrix Architecture
- **Continuous 3px Micro Rail (`.github-micro-rail`):** Razor-thin progress track with glowing gradient head (`.github-micro-bar`) syncing with exact percentage.
- **100-Cell GitHub Commit Matrix (`#github-boxes-grid`):** 4 rows × 25 columns representing 1% increments with authentic green commit levels (0-4), active connection pulse animations, and streaming wave modes.
- **Progress Meta Header & Footer:** Formatted block count (`0-100 blocks`), exact transferred bytes (`bytes(downloaded) / bytes(total)`), and commit activity legend (`Less [0][1][2][3][4] More`).

### 7.4 Floating Action Island (`.transfer-buttons`)
- **Primary Cerulean Resume (`#detail-resume`):** Specular highlight and high visual priority.
- **Titanium Amber Pause (`#detail-stop`):** Warning tint and smooth hover glass glow.
- **Subdued Crimson Cancel (`#detail-cancel`):** Danger tint for transfer abort.
- **Translucent Glass Address Refresh (`#detail-refresh-url`):** Instant access to update expired CDN links.
- **Monospace Disclosure Pill (`#toggle-details`):** Dynamically toggles segment detail views and signals Electron window resize.

### 7.5 Window Sizing Geometry Contract
- **Collapsed Mode (565 × 320):** Tailored 8px padding and compact metrics grid ensure all critical controls fit within 320px height with zero scrollbars.
- **Expanded Mode (565 × 485):** Smoothly expands window height to reveal multi-threaded connection progress bars and connection table.
- **Completed Mode (480 × 280):** Compact celebration receipt card with 36px glowing emerald checkmark badge, formatted byte count, and primary "Open File" action button.

