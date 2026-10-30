# Canvas Deck: agent guide

Multi-presenter presentation tool. One big pan/zoom canvas, each slide is an artboard (a React component). Several people present at once, all with equal rights. Runs in the browser, hosted on GitHub Pages, no backend.

## How it works (read this first)
- **Slides** = folders in `src/slides/<NN>-<name>/` with `slide.tsx` (default export React component, optional `export const meta`) and optional `notes.md`. Auto-discovered by `src/slides/registry.ts` via `import.meta.glob`, ordered by folder name. Artboard is 1920x1080 world px. Default layout is a horizontal row; override with `meta.x/y/width/height`.
- **Canvas** (`src/canvas/Canvas.tsx`): local camera (pan = wheel/drag, zoom = ctrl+wheel/pinch). The camera is NOT shared, every presenter can look around freely. The **active slide is shared**: when it changes, every camera flies to it.
- **Shared state** is only `{active, ts, by}`, last write wins. Hook: `src/useRoom.ts`. Cursors/presence travel as `CursorMsg` in canvas world coordinates, so everyone sees them on the same spot.
- **Sync layer** (`src/sync/`): `types.ts` defines the `Sync` interface, `p2p.ts` implements it with Trystero (WebRTC, peers find each other through public Nostr relays, no server). To use a WebSocket server instead (e.g. Cloudflare Durable Object), implement `Sync` and change the export in `src/sync/index.ts`. Nothing else changes.
- **Rooms**: hash routes. `#/r/<room>` = main window, `#/r/<room>/notes` = presenter notes window. No hash = random room is created. Whoever has the link joins as a presenter (name prompt, saved in localStorage).
- **Notes window** (`src/notes/`): a second browser window opened from the main one (key N). Talks to the main window through `BroadcastChannel` (`src/channel.ts`), so it only works in the same browser. It shows notes for the active slide, next slide, a timer, and can drive slides. Share the main window, keep the notes window to yourself.

## Edit mode (toggle `E`, default off)
- View mode: click a slide = make it active for everyone, drag = pan. Double click a slide (any mode) = focus it (fly to it, make it active).
- Edit mode: click/shift-click/marquee selects, drag moves selected slides, arrows nudge (Shift = 100), Space+drag pans, Cmd/Ctrl+A selects all. Align/distribute bar at the top. Edit mode is per person, but moves are shared live (`LayoutItem`, last write wins per slide) via `moveSlides` in `src/useRoom.ts`.
- Shared layout lives only in the room. To keep it, press "Copy layout" and paste into `src/slides/layout.json` (`{ "<slide-folder>": {x, y} }`), which overrides `meta.x/y`.
- Align math is in `src/canvas/align.ts` (pure functions).
- UI style: Figma light (canvas #e5e5e5, white panels, blue #0d99ff). Frame labels and selection outlines are screen-constant via the `--px` CSS variable on `.world`.

## Commands
- `npm run dev` local dev server (test multiplayer with two tabs and the same `#/r/<room>`)
- `npm run build` typecheck + production build to `dist/`
- `npm run new-slide -- my-name` scaffold the next slide folder

## Keys
Arrows/Space/PageUp/PageDown: prev/next. `O` overview. `F` re-fit active slide (local). `N` open notes window. `E` toggle edit mode.

## Rules for changes
- Add a slide = add a folder. Do not edit the registry or App for it.
- Slide assets (images, video, svg) live in the slide folder and are imported.
- Keep the networking behind the `Sync` interface. Do not import `trystero` outside `src/sync/p2p.ts`.
- Keep shared state minimal. Anything shared must be added to `SharedState`/`useRoom` and be conflict-safe (last write wins).
- P2P limits: WebRTC can be blocked by strict corporate networks/VPN, and room state is lost when everyone leaves. That is why `Sync` is swappable.
- Deploy: push to `main`, GitHub Action builds and publishes to Pages. `vite.config.ts` uses `base: './'`, keep it.
- Language: UI and docs in English. Never use em dashes in docs.
