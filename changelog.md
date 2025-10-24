# Changelog
All notable changes to this project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Docs
- (2025-10-23) Update `README.md` to reflect the modular overlay and the new entry point (`alert_overlay.html`) and utilities (`utils/*`).
### Changed
- (2025-10-23) Moved `DistortionMask` and `MosaicFallback` classes into `utils/overlay.animations.js` and export helpers via `window.overlayFX`, keeping overlay animations modular and reusable.
- (2025-10-23) Reworked the `overlayFX.scramble` handler to support looping animations with configurable delays so long-lived labels (like the chk badge) can continue cycling text.
- (2025-10-23) Alert card template now feeds the chk badge through `data-fx="scramble"` (with legacy copy) and restores bracketed chip labels (`[ TYPE ]`) while adding explicit `AdRun` meta handling.
- (2025-10-24) Added bus listeners in `alert_overlay.html` for follow, raid, resub, gift, bits, and ad events and passed ad length through so timers render with the shared clamp helper.
- (2025-10-24) Expanded `overlay.stylesheet.css` with chat/camera grid helpers, card width, and pruned legacy scanlines to support the new camera overlay layout.
- (2025-10-24) Introduced `camf_overlay.html` scaffold using the modular assets for the 21:9 camera scene.
- (2025-10-24) Tweaked `overlay.utils.js` clamp helper and guarded Streamer.bot username parsing with optional chaining in `overlay.sb.js` to avoid undefined user objects.
### Fixed
- (2025-10-23) Correct alert card lifetime animation where the progress bar vanished instantly and cards overstayed because the Anime.js tween used `this.durationMs`; now references `this._durationMs` so the bar and dismissal honor the configured alert duration.
- (2025-10-23) Alert exit animation no longer snaps invisible—removed the premature `anime.set(...)` so the fade/translate tween and mask transition play through before the card is destroyed.
- (2025-10-23) Bus payloads now strip string `"null"` values before building alert cards, preventing placeholder text from rendering when fields are absent.
- (2025-10-23) Empty user messages no longer show the `"USER MESSAGE VALUE"` fallback; the note row stays blank unless a message exists.

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
