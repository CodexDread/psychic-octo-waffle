# Psychic Octo Waffle

A standalone, retro-style alert overlay for streamers, implemented in a single HTML file with vanilla CSS and JavaScript. The overlay displays Twitch events with an ASCII/CRT aesthetic.

## Files
- `alert_box.html` – main overlay code. It defines the visual style, configuration options, and event handling logic.

## Features
- **CRT-inspired visuals:** Uses custom CSS variables to control colors, fonts, and glow effects.
- **WebGL distortion:** Three.js and Anime.js power an optional distortion mask and animations.
- **Streamer.bot integration:** Connects to Streamer.bot via WebSocket to subscribe to Twitch events such as follows, raids, cheers, subs, resubs, gift subs, and ad breaks.
- **Configurable behavior:** Edit the `CONFIG` block in the HTML to set stack position, timer bars, durations, and message templates.
- **Offline testing:** Built-in test UI and keyboard shortcuts let you simulate events without connecting to Streamer.bot.

## Usage
1. Open `alert_box.html` as a browser source in OBS or a web browser.
2. Adjust settings inside the `CONFIG` object (host, port, visuals, etc.) to suit your setup.
3. Enable `SHOW_TEST_UI` to display on-screen buttons for triggering example alerts.
4. Run Streamer.bot and watch alerts animate in the overlay when events occur.

## License
No explicit license has been provided for this project.
