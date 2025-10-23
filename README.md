# Psychic Octo Waffle — Overlay Kit v1
A modular, retro-style alert overlay (VT323 / DOS-Unix vibe) for OBS that listens to Streamer.bot and renders alerts as animated cards. This update replaces the legacy single-file overlay with a shared **utils + styles + animations** kit.

## What’s new (v1.0.0)
- New entry: `alert_overlay.html` (imports shared utils, SB client, styles, animations)
- Central event bus (`overlayKit.Bus`) and helpers (`query`, `array`, `clamp`, `mmss`)
- Declarative `data-fx` animations (fade, slide, scramble, progress bar fill)
- Shared stylesheet and theme tokens (VT323, dashed borders, currentColor glow)
- SB connection badge toggles via `[hidden]` when connected

## Requirements
- **OBS** with Browser Source (local file or hosted)
- **Streamer.bot** running locally (default `ws://127.0.0.1:8080/`)
- Internet access for CDN scripts (Anime.js, Three.js, Streamer.bot client, Google Fonts) unless self-hosting

## Quick Start
1. Open **`alert_overlay.html`** as a Browser Source in OBS (Local File ✅).
2. Ensure **Streamer.bot** is running on `127.0.0.1:8080`.
3. Trigger a follow/sub/cheer/etc. and watch a card appear.
4. The **SB status badge** (`#sb-status`) hides itself when connected.

> Tip: If you keep this on disk, use absolute file paths in OBS or host the folder via a local server for caching and dev tools.