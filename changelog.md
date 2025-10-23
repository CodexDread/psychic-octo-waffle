# Changelog
All notable changes to this project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Docs
- Update `README.md` to reflect the modular overlay and the new entry point (`alert_overlay.html`) and utilities (`utils/*`).

## [1.0.0] - 2025-10-23 — Modular overlay rewrite
### Added
- **`alert_overlay.html`**: New entry point that imports shared utilities (`overlay.utils.js`, `overlay.sb.js`), the shared stylesheet (`overlay.stylesheet.css`), and data-tag animations (`overlay.animations.js`). It renders alerts using a stack and card pattern.
- **`utils/overlay.utils.js`**: Shared `overlayConfig` defaults, DOM helpers (`query`, `array`), math/format helpers (`clamp`, `mmss`), and an app-wide event bus exposed as `overlayKit.Bus`.
- **`utils/overlay.sb.js`**: Centralized Streamer.bot client that parses Twitch payloads and emits normalized events on the bus (`alerts:*`, `ads:start`, `sb:connected`).
- **`utils/overlay.stylesheet.css`**: Extracted theme tokens (VT323 font, colors, dashed borders), UI primitives (`[data-ui]`), stack/card styles, and the `#sb-status` badge with `[hidden]` support.
- **`utils/overlay.animations.js`**: Declarative FX system (`fade-in`, `slide-up`, `pulse`, `scramble`, `bar:to`) driven by `data-fx` attributes; auto-applies to dynamically added nodes.

### Changed
- Alert rendering refactored into a `makeAlertCard` class using shared helpers and bus-driven events (e.g., `'alerts:sub'`); per-card timer bar animates width with Anime.js; ad countdown uses `mmss(...)`.
- Streamer.bot connection indicator is now controlled by a ping/connected heartbeat on the bus; the badge is hidden when connected by toggling the `[hidden]` attribute.
- Consolidated styles and removed most page-local CSS in favor of the shared stylesheet.

### Deprecated / Archived
- Legacy monolithic overlay moved to **`overlay_old/alert_box.html`**.
- Other legacy scenes archived in **`overlay_old/`**: `brb scene.html`, `cam full scene.html`, `ending_credits.html`, `gameplay scene.html`, `schedule_overlay.html`, `stats.html`, `stinger test 2.html`, `streamerbot_giveaway_system.html`.

## [0.1.0] - 2025-10-23 — Initial public version (legacy)
### Added
- **`overlay_old/alert_box.html`**: Single-file overlay containing visuals, Streamer.bot handling, and Three.js/Anime.js distortion with a CSS mosaic fallback; includes scanlines, a timer bar, and a built-in test UI.
