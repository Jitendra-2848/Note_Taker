# UI Context — Note Taker

## Design Mission: Warm Minimalism for Thoughtful Writing

### Design Philosophy
Transform the digital note-taking experience from a cold, technical security terminal into a **calm, focused writing sanctuary**. 

- **Warm, tactile feel**: Off-white paper-like canvas (`#faf9f7`) paired with crisp white cards (`#ffffff`) and delicate warm borders (`#e8e6e1`).
- **Human & approachable**: Thoughtful typography, generous whitespace, and warm terracotta accents (`#d4735e`) replace harsh neon cyberpunk aesthetics.
- **Editorial readability**: Note bodies rendered in a warm, readable serif typeface (`Merriweather`, `Georgia`, serif) with relaxed line heights (`1.75`), while functional controls use a clean modern sans-serif (`Inter`, system-ui).
- **Security with clarity**: Retains military-grade expiring link security and concurrency controls, but communicates them with calm confidence and respectful clarity rather than alarming warnings.

---

## Design Token System

### Color Palette (`app/globals.css`)

| Token Category | CSS Variable | Hex / Value | Usage Context |
|---|---|---|---|
| **Canvas** | `--color-canvas` | `#faf9f7` | Warm off-white paper canvas background |
| **Surface** | `--color-surface` | `#ffffff` | Pure white cards, modals, dropdowns |
| **Surface Hover** | `--color-surface-hover` | `#f5f4f2` | Subtle interactive hover state |
| **Borders** | `--border-subtle` | `#e8e6e1` | Subtle divider lines and card borders |
| | `--border-default` | `#ddd9d2` | Interactive input borders |
| **Typography** | `--color-text-primary` | `#1a1a1a` | Deep charcoal for headings & primary text |
| | `--color-text-secondary` | `#6b6b6b` | Warm medium gray for descriptions & labels |
| | `--color-text-tertiary` | `#a0a0a0` | Light gray for hints & subtle metadata |
| **Brand Accent** | `--color-accent` | `#d4735e` | Warm Earthy Terracotta (primary action) |
| | `--color-accent-dark` | `#b85c47` | Hover state for terracotta actions |
| | `--color-accent-light` | `#fdf2f0` | Soft terracotta tint for active badge backgrounds |
| | `--color-accent-border` | `#f0c2b7` | Subtle border for terracotta elements |
| **Semantic Colors** | `--color-success` | `#52b788` | Gentle forest green for active/unlocked states |
| | `--color-warning` | `#f4a261` | Warm amber for password-protection & time limits |
| | `--color-error` | `#e63946` | Muted brick red for errors and revoked status |
| | `--color-purple` | `#7b5ea7` | Warm violet for one-time burn notices |
| **Shadows & Depth** | `--shadow-soft` | `0 2px 8px rgba(0, 0, 0, 0.04)` | Subtle card elevation |
| | `--shadow-medium` | `0 4px 16px rgba(0, 0, 0, 0.07)` | Hover card elevation |
| | `--shadow-elevated` | `0 12px 32px rgba(0, 0, 0, 0.09)` | Modals, overlays, floating panels |

---

## Typography System

- **Content & Notes**: `'Merriweather', 'Georgia', serif` — Warm, readable, literary serif for note reading and writing.
- **UI Elements**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` — Clean, legible modern sans for buttons, labels, and navigation.
- **Codes & Keys**: `'JetBrains Mono', 'Fira Code', monospace` — For dynamic password keys, token URLs, and code blocks.

---

## Component Guidelines

### 1. WarmCard (`components/ui/GlassCard.tsx`)
Crisp white paper-like cards on a warm `#faf9f7` canvas with soft shadows, subtle warm borders, and smooth hover lift effects.

### 2. StatusBadge (`components/ui/StatusBadge.tsx`)
Pill badges with soft, natural background tints and subtle borders:
- `Active`: Soft green tint (`#eef8f3`) with `#2d6a4f` text.
- `Protected`: Soft amber tint (`#fef8f0`) with `#b45309` text.
- `One-Time Burn`: Soft purple tint (`#f5f2fa`) with `#6b46c1` text.
- `Revoked / Expired`: Soft red tint (`#fdf2f2`) with `#c53030` text.

### 3. CopyButton (`components/ui/CopyButton.tsx`)
Minimalist, elegant button with terracotta or warm neutral outlines and gentle checkmark feedback.

---

## Page Layouts & Tone of Voice

### 1. `/login` & `/register`
- Warm, focused writing sanctuary portal.
- Friendly, encouraging headers ("Welcome back to your writing sanctuary", "Create your writing space").
- Show/hide password toggles with soft transitions.

### 2. `/notes/new`
- Distraction-free composition area with warm serif typography.
- Clear, tactile radio buttons for sharing options.
- Dynamic access key generator with a friendly, readable copy button.
- "Ready to Share" modal with clean one-click copy package.

### 3. `/notes/[id]`
- Reads like a beautifully printed essay or journal entry.
- Clean link table detailing active readers and expiry countdowns.
- Respectful, straightforward link revocation dialog.

### 4. `/share/[token]`
- Welcoming, secure reading portal.
- Clear explanation of access requirements before entering password.
- Graceful feedback on incorrect key entry without harsh alarmism.
- Once unlocked, renders the note in pristine literary typography.