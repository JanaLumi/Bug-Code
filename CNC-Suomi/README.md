# CNC Audio-First Language Trainer

A lightweight, zero-dependency HTML/CSS/JS web app designed for GitHub Pages.

## Structure
- `index.html` — Layout, audio controls, and transcript accordion.
- `style.css` — High-contrast industrial touch-screen styling.
- `app.js` — CSV parser, Web Speech API (`fi-FI`), and smart visual loader.
- `exercises.csv` — Backend exercise table (edit or append rows directly).
- `assets/drill-bit.svg` — Sample custom vector icon.

## Adding New Exercises & Custom Images
In `exercises.csv`, the `btnX_visual` columns accept **either** an emoji (e.g. `⚙️`) **or** a file path to an SVG/PNG image (e.g. `assets/drill-bit.svg`). `app.js` detects the file extension automatically—no extra CSV columns needed.
