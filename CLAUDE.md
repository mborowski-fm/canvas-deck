# Canvas Deck: agent guide

Multi-presenter presentation tool. One big pan/zoom canvas, each slide is an artboard (a React component). Several people present at once, all with equal rights. Runs in the browser, hosted on GitHub Pages, no backend.

## How it works (read this first)
- **Slides** = folders in `src/slides/<NN>-<name>/` with `slide.tsx` (default export React component, optional `export const meta`) and optional `notes.md`. Auto-discovered by `src/slides/registry.ts` via `import.meta.glob`, ordered by folder name. Artboard is 1920x1080 world px. Default layout is a horizontal row; override with `meta.x/y/width/height`.
- **Canvas** (`src/canvas/Canvas.tsx`): local camera (pan = wheel/drag, zoom = ctrl+wheel/pinch). The camera flies to the active slide when it changes. Camera and active slide are local to each presenter (see Multiplayer model).
- **Room** hook: `src/useRoom.ts`. Cursors/presence travel as `CursorMsg` in canvas world coordinates, so everyone sees them on the same spot.
- **Sync layer** (`src/sync/`): `types.ts` defines the `Sync` interface, `p2p.ts` implements it with Trystero (WebRTC, peers find each other through public Nostr relays, no server). To use a WebSocket server instead (e.g. Cloudflare Durable Object), implement `Sync` and change the export in `src/sync/index.ts`. Nothing else changes.
- **Rooms**: hash routes. `#/r/<room>` = main window, `#/r/<room>/notes` = presenter notes window. No hash = random room is created. Whoever has the link joins as a presenter (name prompt, saved in localStorage).
- **Notes window** (`src/notes/`): a second browser window opened from the main one (key N). Talks to the main window through `BroadcastChannel` (`src/channel.ts`), so it only works in the same browser. It shows notes for the active slide, next slide, a timer, and can drive slides. Share the main window, keep the notes window to yourself.

## Slides from Figma (current deck)
- Source: Figma file `TVxGtPg72Xpe38wLHXTiaS` ("UI-Prezentacja storyboard"), section node `139:359`. Each slide folder's `slide.tsx` names its source frame id.
- Each frame is exported as SVG (Figma MCP `download_assets`, `defaultFormat: svg`) into `slide.svg`, from its merged copy (see Seams below). Drop `<mask>` attributes with `inf`/`nan` values.
- `src/slides/SvgSlide.tsx` inlines the SVG (vector-sharp at any zoom) and prefixes every id with the slide id, so slides do not clash. The SVG keeps the Figma layer tree (`<g id="Layer name">`), so every layer is its own animatable DOM element.
- Text is live `<text>`, not curves: edit the words directly in `slide.svg`. The download export outlines text, so texts were swapped in from a plugin export (`exportAsync({format:'SVG_STRING', svgOutlineText:false, svgIdAttribute:true})`), matched by layer id. Fonts (Figtree, Inter) load from Google Fonts in `index.html`.
- Seams: Figma patterns are tiles that touch edge to edge, and anti-aliasing shows a hairline of background between them. Fixed at the source: slides are exported from copies on the Figma page "Canvas Deck export", where a script merged every "Pattern tiles" group into one shape per color (layer i = union of the colors above it, so lower colors run underneath and no two edges coincide). Do not fix seams in CSS or by growing shapes.
- Re-exporting a slide: run the merge on a fresh copy of its frame on that page (the use_figma script is in `docs/figma-pattern-merge.js`), export the copy with `download_assets` (svg), drop the page background `<rect fill="#F5F5F5">`, remove " [export ...]" from the frame id, swap in live text, and re-apply hand-made animation layers (02-percepcja: Eye / Eye clip / Iris / Pupil / Eyelids).
- Figma layer names become ids: animate a layer with `[id="<slug>__<Layer name>"]` (e.g. from a `useEffect` in that slide's `slide.tsx`). For heavier animation, rebuild that slide as React/SVG using the Figma variables (Figtree, colors like `color/tangerine #ff7036`, `text/primary #44441a`).
- Animations (only on the active slide, local to each presenter):
  - Declare them in the slide's `meta.animations` (`{ description, loop? }[]`). Descriptions are appended to the speaker notes automatically ("## Animation").
  - The component gets `play: { anim, key } | null` (`SlideProps`). `null` = slide not active: render the rest pose. A new `key` = (re)start animation `anim` from t=0.
  - One animation: it autoplays when the slide becomes active (or loops if `loop: true`). Several: small 1, 2, 3 buttons appear in the active slide's bottom-left corner. The Replay button (top bar, key `R`) restarts the current one (local; followers see it through your view).
  - Write animations as a pure function of time since `play.key` changed (see `02-percepcja/eye.ts`), so a follower sees the same motion. No cursor-driven animations.
  - Use the helpers in `src/slides/motion.ts` (`spring`, `wobble`, `runTimeline`) for natural motion: springs with a little overshoot, anticipation before a move, follow-through after; avoid linear or plain smoothstep tweens.
  - Layers: group what you animate inside `slide.svg` (e.g. `<g id="Iris">`), reach them by `[id="<slug>__<layer>"]` from a `useEffect` in `slide.tsx` (wrap `<SvgSlide>` in a div with a ref). Put clip-paths on a wrapper group, not on the group you move.
  - New animated slides: use `RiggedSlide` (`src/slides/RiggedSlide.tsx`) with a rig built by `makeRig(pose, { loop | end })` from `motion.ts`; `pose(t)` sets transforms from time, `pose(null)` restores the Figma design. `layerFinder` finds layers by name, `rand(seed)` gives deterministic randomness, `around(cx, cy, ...)` scales/rotates around a point.
  - Animated slides (all loops unless noted): 01 mood carousel (6th face is a code copy, off-frame), 02 eye, 05 blocks center to left and back, 06 bricks, 07 heart after Marcin's 4 key frames: walls (lime left, magenta right, drawn in code) touch it; it pushes the lime wall twice to 1/3 and the 3rd strike knocks it out, crosses and does the same to the magenta wall (2/3, slower exit); walls stay fully opaque while leaving; it returns to the middle; only the lub-dub loops. The heart must read as the active side: it winds up, lunges and presses ~12 px into the wall, and the wall gives way a beat later and slower (never moves by itself), 09 blinking caret, 10 T shows 5 fonts per box vibe (standard sans / serious serif / playful) with a calm crossfade (fonts loaded with `text=T` in `index.html`), 13 cursor trail (each trail cursor lies under the lead and is uncovered as it moves on, covered again on the way back; never pops in), 15 nervous finger + KLIK labels, max 12 (endless, seeded), 16 finger taps + buzzing zigzags, 17 bouncy pink vs heavy black ball, both glide back up, 19 podium lifts the flasks standing at the bottom (one-shot, slow), 20 spotlight with a fixed light source, 22 dots hop between grids (seeded), 24 clouds drift + flower turns.
  - A page in a hidden browser tab or pane gets no requestAnimationFrame: animations look frozen there. Test with the preview visible.
  - `06-podswiadomy-porzadek`: loop (`bricks.ts`): knock-out as a chain reaction (each brick starts only when the one below hits it: `pushedBy`, `CONTACT`; hit bricks start fast and ease out, the hitter recoils), hold still, rebuild top first, neat pause, repeat. Bricks are rigid and heavy: stiff springs (damping ~0.9), tiny lift, no float or wobble, short hard knocks on neighbors. Match motion to the material.
  - Idle phase (optional, for one-shot animations): after it settles, add a small looping motion with an envelope that fades it in and out. Not for rigid materials.
  - `02-percepcja`: idle loop (`eye.ts`, springs from `src/slides/motion.ts`), the eye glances around in saccades; the iris pattern and its brown center move as one element; blinks are tangerine lids sliding over the eye inside its clip (the eye itself is never scaled).
- `src/slides/layout.json` mirrors the Figma positions (frame x/y minus the first frame's 680/431).

## Edit mode (toggle `E`, default off)
- View mode: click a slide = make it active for everyone, drag = pan. Double click a slide (any mode) = focus it (fly to it, make it active).
- Edit mode: undo/redo (Cmd+Z, Cmd+Shift+Z, local history of layout moves), grid arrange of the selection, click/shift-click/marquee selects, drag moves selected slides, Alt+arrows nudge (Shift = 100; plain Left/Right always change the slide), Space+drag pans, Cmd/Ctrl+A selects all. Align/distribute bar at the bottom. Edit mode is per person, but moves are shared live (`LayoutItem`, last write wins per slide) via `moveSlides` in `src/useRoom.ts`.
- Edit bar: undo/redo, an "Align" popover (align, distribute, grid; needs 2+ selected), reset layout (back to the positions from the files at load, undoable), and Save layout.
- Save layout exists only in `npm run dev`: the `deck-save` Vite plugin (`vite.config.ts`, `POST /__deck/save`, client `src/save.ts`) writes `src/slides/layout.json`, which overrides `meta.x/y`. Its own writes skip HMR. On the deployed site layout edits stay in the room only.
- Speaker notes are not editable in the app: Marcin sends them in chat and the agent writes them into `src/slides/<id>/notes.md`.
- Align math is in `src/canvas/align.ts` (pure functions).
- UI style: follows the Figma frame `Canvas Deck / Edit mode` (node `160:359`, page WIP). All colors come from the Figma "Brand" variables, mirrored 1:1 in `src/tokens.css` (`color/ink` -> `--color-ink`, aliases like `--text-accent`); never hardcode colors in `styles.css`. Bars use `--color-ice`, the CTA is ultraviolet with lime text, canvas is `--neutral-ink-10`, presenter colors are Brand colors. Font Google Sans Flex, icons Material Symbols Sharp (filled), M3 Expressive shapes/motion. Frame labels and selection outlines are screen-constant via the `--px` CSS variable on `.world`.

## Free elements on the canvas (images, videos, web pages)
- `src/items.ts`: `CanvasItem` = `{ id, kind: image | video | embed | web, src, x, y, width, height }`. Not part of the slide order (arrows skip them). Local to each presenter, NOT synced (only the active slide/focus is shared).
- Edit mode: "+" opens `AddDialog` (paste a link) and links or files can be dropped on the canvas. `detectKind` picks the kind (extension, YouTube/Vimeo, else tries the link as an image, else web page). Media keep their aspect ratio when resized (bottom-right handle); web pages resize freely. Delete/Backspace or the trash button removes; all of it is in undo/redo, select, move, align.
- Files (dev only): uploaded via `POST /__deck/upload` to `public/media/<time>-<name>` and referenced as `media/<file>` (works on Pages too after commit). Large videos bloat the repo: prefer links for big files.
- Saved with Save layout (dev) to `src/slides/items.json`. On the deployed site added elements live only until reload.
- Web pages are heavy (a whole website running inside the transformed canvas makes panning stutter), so they render as a light card; "Show live page" mounts the iframe for that one page. It unmounts on Esc, the close button, a click on the background or a slide change; at most one page is live. Keep it that way.
- View mode: videos and live pages take their own clicks (controls, scrolling). Some sites refuse to be embedded and show an empty frame; the label above each element links to the source.

## Multiplayer model: presenters do not get in each other's way
- Local to each presenter: active slide, animations (replay, 1/2/3), camera, canvas elements. Another presenter's click never moves you.
- Shared: cursors and avatars (presence), slide positions from edit mode, and every presenter's view (`ViewMsg`: camera world rect + active slide + playing animation, throttled ~60 ms, `sendView` in `useRoom`).
- Follow mode: click another presenter's avatar (hover shows "Śledź <name>") to see the deck through their eyes: their camera (fitted to your viewport), their active slide and animation. Their avatar is highlighted, the screen gets a frame in their color and a bottom bar "Śledzisz <name>" with "Przestań". It stops on that button, Esc, clicking the avatar again, or when you navigate or move the camera yourself.

## Versioning
- Bottom-left build stamp (`src/BuildInfo.tsx`): `v<package.json version> · <commit> · <build time>`, injected as `__BUILD__` in `vite.config.ts` (commit from `GITHUB_SHA` in Actions). On each release bump `package.json` version and tag `v<major.minor>`.

## Commands
- `npm run dev` local dev server (test multiplayer with two tabs and the same `#/r/<room>`)
- `npm run build` typecheck + production build to `dist/`
- `npm run new-slide -- my-name` scaffold the next slide folder

## Keys
Left/Right and PageUp/PageDown: prev/next slide in every mode (Space too, outside edit mode). Esc stops following. `O` overview. `F` re-fit active slide (local). `N` open notes window. `E` toggle edit mode.

## Rules for changes
- Add a slide = add a folder. Do not edit the registry or App for it.
- Slide assets (images, video, svg) live in the slide folder and are imported.
- Keep the networking behind the `Sync` interface. Do not import `trystero` outside `src/sync/p2p.ts`.
- Keep shared state minimal: presenters must not move each other. Anything shared goes through `useRoom` and must be conflict-safe (last write wins).
- P2P limits: WebRTC can be blocked by strict corporate networks/VPN, and room state is lost when everyone leaves. That is why `Sync` is swappable.
- Deploy: push to `main`, GitHub Action builds and publishes to Pages. `vite.config.ts` uses `base: './'`, keep it.
- Icons: Google Material Symbols Sharp (filled) via `<Icon name="..." />` (`src/Icon.tsx`). The font URL in `index.html` lists only the used icon names (alphabetical); add new ones there.
- Main controls live in the top-right toolbar (prev/next, edit toggle, notes) next to the presenter avatars; the edit bar sits bottom-center. Overview (`O`) and focus (`F`) are keyboard only; the invite link is the page URL.
- Language: UI and docs in English, except the follow-mode strings ("Śledź", "Śledzisz", "Przestań"), and the rename dialog (click your own avatar: "Zmień imię", "Anuluj", "Zapisz"), which Marcin asked for in Polish. Never use em dashes in docs.
