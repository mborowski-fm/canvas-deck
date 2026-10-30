# Canvas Deck: agent guide

Multi-presenter presentation tool. One big pan/zoom canvas, each slide is an artboard (a React component). Several people present at once, all with equal rights. Runs in the browser, hosted on GitHub Pages, no backend.

## How it works (read this first)
- **Slides** = folders in `src/slides/<NN>-<name>/` with `slide.tsx` (default export React component, optional `export const meta`) and optional `notes.md`. Auto-discovered by `src/slides/registry.ts` via `import.meta.glob`, ordered by folder name. Artboard is 1920x1080 world px. Default layout is a horizontal row; override with `meta.x/y/width/height`.
- **Canvas** (`src/canvas/Canvas.tsx`): local camera (pan = wheel/drag, zoom = ctrl+wheel/pinch). The camera is NOT shared, every presenter can look around freely. The **active slide is shared**: when it changes, every camera flies to it.
- **Shared state** is only `{active, ts, by}`, last write wins. Hook: `src/useRoom.ts`. Cursors/presence travel as `CursorMsg` in canvas world coordinates, so everyone sees them on the same spot.
- **Sync layer** (`src/sync/`): `types.ts` defines the `Sync` interface, `p2p.ts` implements it with Trystero (WebRTC, peers find each other through public Nostr relays, no server). To use a WebSocket server instead (e.g. Cloudflare Durable Object), implement `Sync` and change the export in `src/sync/index.ts`. Nothing else changes.
- **Rooms**: hash routes. `#/r/<room>` = main window, `#/r/<room>/notes` = presenter notes window. No hash = random room is created. Whoever has the link joins as a presenter (name prompt, saved in localStorage).
- **Notes window** (`src/notes/`): a second browser window opened from the main one (key N). Talks to the main window through `BroadcastChannel` (`src/channel.ts`), so it only works in the same browser. It shows notes for the active slide, next slide, a timer, and can drive slides. Share the main window, keep the notes window to yourself.

## Slides from Figma (current deck)
- Source: Figma file `TVxGtPg72Xpe38wLHXTiaS` ("UI-Prezentacja storyboard"), section node `139:359`. Each slide folder's `slide.tsx` names its source frame id.
- Each frame is exported as SVG (Figma MCP `download_assets`, `defaultFormat: svg`) into `slide.svg`. The export includes the parent section background: strip the first `<rect fill="#E2E0DA">` and the two section `<path d="M-...">` lines, and drop `<mask>` attributes with `inf`/`nan` values.
- `src/slides/SvgSlide.tsx` inlines the SVG (vector-sharp at any zoom) and prefixes every id with the slide id, so slides do not clash. The SVG keeps the Figma layer tree (`<g id="Layer name">`), so every layer is its own animatable DOM element.
- Text is live `<text>`, not curves: edit the words directly in `slide.svg`. The download export outlines text, so texts were swapped in from a plugin export (`exportAsync({format:'SVG_STRING', svgOutlineText:false, svgIdAttribute:true})`), matched by layer id. Fonts (Figtree, Inter) load from Google Fonts in `index.html`.
- Figma layer names become ids: animate a layer with `[id="<slug>__<Layer name>"]` (e.g. from a `useEffect` in that slide's `slide.tsx`). For heavier animation, rebuild that slide as React/SVG using the Figma variables (Figtree, colors like `color/tangerine #ff7036`, `text/primary #44441a`).
- `src/slides/layout.json` mirrors the Figma positions (frame x/y minus the first frame's 680/431).

## Edit mode (toggle `E`, default off)
- View mode: click a slide = make it active for everyone, drag = pan. Double click a slide (any mode) = focus it (fly to it, make it active).
- Edit mode: undo/redo (Cmd+Z, Cmd+Shift+Z, local history of layout moves), grid arrange of the selection, click/shift-click/marquee selects, drag moves selected slides, arrows nudge (Shift = 100), Space+drag pans, Cmd/Ctrl+A selects all. Align/distribute bar at the bottom. Edit mode is per person, but moves are shared live (`LayoutItem`, last write wins per slide) via `moveSlides` in `src/useRoom.ts`.
- Edit bar: undo/redo, an "Align" popover (align, distribute, grid; needs 2+ selected), reset layout (back to the positions from the files at load, undoable), and Save layout.
- Save layout exists only in `npm run dev`: the `deck-save` Vite plugin (`vite.config.ts`, `POST /__deck/save`, client `src/save.ts`) writes `src/slides/layout.json`, which overrides `meta.x/y`. Its own writes skip HMR. On the deployed site layout edits stay in the room only.
- Speaker notes are not editable in the app: Marcin sends them in chat and the agent writes them into `src/slides/<id>/notes.md`.
- Align math is in `src/canvas/align.ts` (pure functions).
- UI style: follows the Figma frame `Canvas Deck / Edit mode` (node `160:359`, page WIP). All colors come from the Figma "Brand" variables, mirrored 1:1 in `src/tokens.css` (`color/ink` -> `--color-ink`, aliases like `--text-accent`); never hardcode colors in `styles.css`. Bars use `--color-ice`, the CTA is ultraviolet with lime text, canvas is `--neutral-ink-10`, presenter colors are Brand colors. Font Google Sans Flex, icons Material Symbols Sharp (filled), M3 Expressive shapes/motion. Frame labels and selection outlines are screen-constant via the `--px` CSS variable on `.world`.

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
- Icons: Google Material Symbols Sharp (filled) via `<Icon name="..." />` (`src/Icon.tsx`). The font URL in `index.html` lists only the used icon names (alphabetical); add new ones there.
- Main controls live in the top-right toolbar (prev/next, edit toggle, notes) next to the presenter avatars; the edit bar sits bottom-center. Overview (`O`) and focus (`F`) are keyboard only; the invite link is the page URL.
- Language: UI and docs in English. Never use em dashes in docs.
