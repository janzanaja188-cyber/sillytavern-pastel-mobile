# iPhone Simulator v4.0 — SillyTavern Extension

iOS-minimal phone simulator for SillyTavern with full bot integration.

## Features
- iOS minimal design — dark/light mode, accent colors, home wallpaper
- **CoT / think-tag cleanup** — strips `<think>`, `[HELIOS]`, `[PHASE]`, `//--` etc. automatically
- **{{user}} avatar** — pulls from SillyTavern persona
- **History toggle** — per-character on/off + message limit
- **Instagram** — stories (24h), notes, photo feed
- **X / Twitter** — For You / Following / Trending tabs, compose, likes, RT, bot reactions
- **Call + Chat split** — text while on a call, generate bot replies mid-call, call transcript log
- **Wallpaper** — home screen + per-chat background (presets or upload)
- **Messages** — stickers (AI-described), photos, voice, location, red envelope gift
- **Bank** — transfer/receive, transaction history
- **Edit mode** — delete individual messages
- **Bot notes** — bot posts a status note visible in chat list & Instagram
- **Call log** — full transcript viewer

## Installation

1. Go to **SillyTavern → Extensions → Install extension**
2. Paste your GitHub raw URL, e.g.:
   ```
   https://raw.githubusercontent.com/YOUR_USER/iphone-simulator/main/
   ```
3. Or place the folder in `SillyTavern/public/scripts/extensions/third-party/iphone-simulator/`
4. Reload SillyTavern — tap the 📱 button to open

## Files
| File | Purpose |
|------|---------|
| `index.js` | Main extension logic (~140 KB) |
| `style.css` | Minimal stub (CSS injected by JS) |
| `manifest.json` | Extension metadata |

## Usage
- **📱 button** → open simulator
- **Messages → +** → add a SillyTavern character as contact
- **Generate Reply** → bot responds in character
- **Call button** → voice call UI with simultaneous chat
- **Settings** → theme, accent, wallpaper, sticker manager
