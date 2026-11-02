/**
 * Bohater? (loop): a colorful dot hops from the right grid onto a grey dot on the left, and a
 * moment later a grey dot from the left hops into the gap it left on the right. Then both hop
 * home. Hops are soft and bouncy: crouch, arc, squash on landing. Each cycle picks other dots
 * (seeded, the same on every screen). Rest pose = the Figma design.
 * Interactive (local to each presenter): drag a dot onto a dot of the other group and they swap:
 * the dragged one lands in that place and the other one hops into the dragged one's place.
 * The first drag stops the automatic hops (Replay brings them back, with the dots reset).
 */
import { around, clamp01, layerFinder, M3, rand, runTimeline, spring, toSlidePoint, type Rig } from '../motion'

const LOOP = 7.5
const FLIGHT = 0.55
const ARC = 170 // px jump height
const HOPS = { colorOut: 0.6, greyOut: 2.4, greyBack: 4.6, colorBack: 5.4 } // start times
type Dot = { el: SVGGraphicsElement; cx: number; cy: number }

/** a hop from a to b starting at `start`: position offset, and squash/stretch */
function hop(t: number, start: number, a: Dot, b: Dot) {
  const u = t - start
  if (u < -0.15) return null
  if (u < 0) {
    const k = Math.sin(clamp01((u + 0.15) / 0.15) * (Math.PI / 2)) // crouch, easing in
    return { dx: 0, dy: 0, sx: 1 + 0.14 * k, sy: 1 - 0.2 * k }
  }
  if (u < FLIGHT) {
    const p = u / FLIGHT
    const e = 0.5 - 0.5 * Math.cos(Math.PI * p)
    const st = Math.abs(1 - 2 * p) // stretched at take-off and landing, round at the top
    return { dx: (b.cx - a.cx) * e, dy: (b.cy - a.cy) * e - ARC * 4 * p * (1 - p), sx: 1 - 0.1 * st, sy: 1 + 0.16 * st }
  }
  // landed: squash and spring back to round
  const s = spring(u - FLIGHT, 2.6, 0.38) // jelly settle
  return { dx: b.cx - a.cx, dy: b.cy - a.cy, sx: 1.22 - 0.22 * s, sy: 0.72 + 0.28 * s }
}

export function hopRig(root: HTMLElement, prefix: string): Rig {
  const $ = layerFinder(root, prefix)
  const svg = root.querySelector('svg')
  const left: Dot[] = []
  const right: Dot[] = []
  svg?.querySelectorAll<SVGRectElement>('rect[rx]').forEach((r) => {
    // the plain grey dots of the left grid (the patterned dots on the right contain rects too)
    if (!r.id.includes('Rectangle') || r.closest('[id*="Pattern"]') || r.getAttribute('fill') !== '#F1F1DC') return
    const x = +r.getAttribute('x')!, y = +r.getAttribute('y')!, w = +r.getAttribute('width')!
    left.push({ el: r, cx: x + w / 2, cy: y + w / 2 })
  })
  svg?.querySelectorAll<SVGGElement>(`g[id^="${prefix}__Pattern / Rectangle"]`).forEach((g) => {
    const m = g.querySelector('mask')
    if (!m) return
    const x = +m.getAttribute('x')!, y = +m.getAttribute('y')!, w = +m.getAttribute('width')!, h = +m.getAttribute('height')!
    right.push({ el: g, cx: x + w / 2, cy: y + h / 2 })
  })
  void $
  const all = [...left, ...right]
  const apply = (d: Dot, o: { dx: number; dy: number; sx: number; sy: number } | null) =>
    o ? d.el.setAttribute('transform', `translate(${o.dx.toFixed(2)} ${o.dy.toFixed(2)}) ${around(d.cx, d.cy + 43, `scale(${o.sx.toFixed(3)} ${o.sy.toFixed(3)})`)}`) : d.el.removeAttribute('transform')

  const autoPose = (t: number | null) => {
    all.forEach((d) => { d.el.removeAttribute('transform'); d.el.removeAttribute('opacity') })
    if (t === null || !left.length || !right.length) return
    const k = Math.floor(t / LOOP)
    const lt = t - k * LOOP
    const C = right[Math.floor(rand(k * 3 + 1) * right.length)] // colorful hero
    const L = left[Math.floor(rand(k * 3 + 2) * left.length)] // where it lands
    let G = left[Math.floor(rand(k * 3 + 3) * left.length)] // grey dot that answers
    if (G === L) G = left[(left.indexOf(L) + 7) % left.length]
    // colorful dot: out to L, later back home
    const back = hop(lt, HOPS.colorBack, L, C)
    const out = hop(lt, HOPS.colorOut, C, L)
    if (back) apply(C, { ...back, dx: back.dx + L.cx - C.cx, dy: back.dy + L.cy - C.cy })
    else apply(C, out)
    // the grey dot under the landing spot ducks away while the hero sits on it
    const onTop = lt > HOPS.colorOut + FLIGHT * 0.8 && lt < HOPS.colorBack + 0.1
    L.el.setAttribute('opacity', onTop ? '0' : '1')
    // grey dot: into the gap on the right, later back home
    const gBack = hop(lt, HOPS.greyBack, C, G)
    const gOut = hop(lt, HOPS.greyOut, G, C)
    if (gBack) apply(G, { ...gBack, dx: gBack.dx + C.cx - G.cx, dy: gBack.dy + C.cy - G.cy })
    else apply(G, gOut)
  }

  // --- interactive: drag a dot onto a dot of the other group to swap them ---
  type State = { slot: { x: number; y: number }; x: number; y: number; vx: number; vy: number; hop: null | { from: { x: number; y: number }; at: number } }
  const DROP = 70 // px: how close to another dot counts as dropping on it
  const play = () => {
    autoPose(null)
    const st = new Map<Dot, State>(all.map((d) => [d, { slot: { x: d.cx, y: d.cy }, x: d.cx, y: d.cy, vx: 0, vy: 0, hop: null }]))
    let interactive = false
    let drag: null | { dot: Dot; ox: number; oy: number; px: number; py: number } = null
    let now = 0
    const toSlide = (e: PointerEvent) => toSlidePoint(svg, e) ?? { x: 0, y: 0 }
    const downs = all.map((d) => {
      const onDown = (e: PointerEvent) => {
        if (!svg) return
        e.stopPropagation() // do not pan the canvas
        e.preventDefault()
        if (!interactive) {
          interactive = true
          autoPose(null)
        }
        const p = toSlide(e)
        const s0 = st.get(d)!
        drag = { dot: d, ox: p.x - s0.x, oy: p.y - s0.y, px: p.x, py: p.y }
        d.el.parentNode?.appendChild(d.el) // on top of its neighbours
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp, { once: true })
      }
      d.el.addEventListener('pointerdown', onDown)
      ;(d.el as SVGElement).style.cursor = 'var(--cursor)'
      return () => d.el.removeEventListener('pointerdown', onDown)
    })
    const onMove = (e: PointerEvent) => {
      if (!drag) return
      const p = toSlide(e)
      drag.px = p.x
      drag.py = p.y
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      if (!drag) return
      const d = drag.dot
      const s = st.get(d)!
      const others = left.includes(d) ? right : left
      let best: Dot | null = null, bd = DROP
      for (const o of others) {
        const so = st.get(o)!
        const dist = Math.hypot(so.slot.x - s.x, so.slot.y - s.y)
        if (dist < bd) { bd = dist; best = o }
      }
      if (best) {
        // swap: the dragged dot takes the place, the other one hops into the dragged one's place
        const sb = st.get(best)!
        const mine = s.slot
        s.slot = sb.slot
        sb.hop = { from: { x: sb.x, y: sb.y }, at: now }
        sb.slot = mine
      }
      drag = null
    }
    const stop = runTimeline((t) => {
      const dt = Math.min(0.05, Math.max(0, t - now))
      now = t
      if (!interactive) return autoPose(t)
      all.forEach((d) => {
        const s = st.get(d)!
        let sx = 1, sy = 1
        if (drag?.dot === d) {
          // follows the cursor on a quick spring, lifted a little
          spring2(s, drag.px - drag.ox, drag.py - drag.oy, ...M3.fast, dt)
          sx = sy = 1.12
        } else if (s.hop) {
          const o = hop(t, s.hop.at + 0.15, { el: d.el, cx: s.hop.from.x, cy: s.hop.from.y }, { el: d.el, cx: s.slot.x, cy: s.slot.y })
          if (o) {
            s.x = s.hop.from.x + o.dx
            s.y = s.hop.from.y + o.dy
            s.vx = s.vy = 0
            sx = o.sx
            sy = o.sy
          }
          if (t - s.hop.at > 0.15 + FLIGHT + 0.8) s.hop = null
        } else {
          spring2(s, s.slot.x, s.slot.y, ...M3.bouncy, dt) // settles into its place with a bounce
        }
        d.el.removeAttribute('opacity')
        d.el.setAttribute('transform', `translate(${(s.x - d.cx).toFixed(2)} ${(s.y - d.cy).toFixed(2)}) ${around(d.cx, d.cy + 43, `scale(${sx.toFixed(3)} ${sy.toFixed(3)})`)}`)
      })
    }, () => autoPose(null))
    return () => {
      stop()
      downs.forEach((off) => off())
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      autoPose(null)
    }
  }
  return { rest: () => autoPose(null), play }
}

/** one step of a damped spring pulling a point toward (tx, ty) */
function spring2(s: { x: number; y: number; vx: number; vy: number }, tx: number, ty: number, freq: number, damp: number, dt: number) {
  const w = 2 * Math.PI * freq
  s.vx += (w * w * (tx - s.x) - 2 * damp * w * s.vx) * dt
  s.vy += (w * w * (ty - s.y) - 2 * damp * w * s.vy) * dt
  s.x += s.vx * dt
  s.y += s.vy * dt
}
