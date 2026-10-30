# Canvas Deck

Presentation tool for several simultaneous presenters. One large canvas, every slide is an artboard that can hold images, video or fully coded elements (animated SVG, React, anything).

- Many presenters at once, everyone sees everyone's cursor (like Figma)
- Equal rights: the active slide is shared, whoever changes it changes it for all
- Presenter window with notes per slide, so you can share one window and keep notes in the other
- Runs in the browser, hosted on GitHub Pages, no server (P2P over WebRTC)

## Quick start
```bash
npm install
npm run dev
```
Open the printed URL. You land in a random room (`#/r/abc123`). Click **Copy invite link** and send it. Anyone with the link joins as a presenter.

## Controls
| Action | How |
|---|---|
| Next / previous slide (for everyone) | Arrows, Space, PageUp/Down, or click a slide |
| Pan | Scroll or drag the background |
| Zoom | Ctrl/Cmd + scroll, or pinch |
| Overview of all slides | `O` |
| Focus a slide again after zooming out | Double click it, or `F` |
| Presenter notes window | `N` |
| Edit canvas (move, multi-select, align) | `E` or the Edit switch, off by default |

## Adding slides
```bash
npm run new-slide -- my-topic
```
Creates `src/slides/04-my-topic/slide.tsx` and `notes.md`. A slide is a React component filling a 1920x1080 artboard. Notes are markdown (`#`, `-`, `**bold**`). See `src/slides/` for examples: text, animated SVG, image.

## Editing the layout
Switch **Edit** on to drag slides (single or selected), select with shift-click or a marquee, and align or distribute them. Moves are shared live with everyone in the room. Locally (`npm run dev`) **Save layout** writes the arrangement to `src/slides/layout.json`; commit it to make it permanent. **Reset** goes back to the saved layout.

## Deploy
Push to `main` on GitHub. The workflow in `.github/workflows/deploy.yml` publishes to GitHub Pages (enable Settings > Pages > Source: GitHub Actions once).

## Working with Claude
Open this folder in Claude Code. `CLAUDE.md` explains the architecture and rules, so the agent can add slides or extend the tool right away.

## Known limits
- P2P needs WebRTC. Strict networks may block it, then swap the sync layer (see `CLAUDE.md`).
- The notes window syncs through the browser, so open it from the main window in the same browser.
