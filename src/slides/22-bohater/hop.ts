/**
 * Bohater? (loop): a colorful dot hops from the right grid onto a grey dot on the left, and a
 * moment later a grey dot from the left hops into the gap it left on the right. Then both hop
 * home. Hops are soft and bouncy: crouch, arc, squash on landing. Each cycle picks other dots
 * (seeded, the same on every screen). Rest pose = the Figma design.
 */
import { around, clamp01, layerFinder, makeRig, rand, spring } from '../motion'

const LOOP = 7.5
const FLIGHT = 0.55
const ARC = 170 // px jump height
const HOPS = { colorOut: 0.6, greyOut: 2.4, greyBack: 4.6, colorBack: 5.4 } // start times
type Dot = { el: SVGGraphicsElement; cx: number; cy: number }

/** a hop from a to b starting at `start`: position offset, and squash/stretch */
function hop(t: number, start: number, a: Dot, b: Dot) {
  const u = t - start
  if (u < -0.15) return null
  if (u < 0) return { dx: 0, dy: 0, sx: 1 + 0.12 * clamp01((u + 0.15) / 0.15), sy: 1 - 0.18 * clamp01((u + 0.15) / 0.15) } // crouch
  if (u < FLIGHT) {
    const p = u / FLIGHT
    const e = p * p * (3 - 2 * p)
    return { dx: (b.cx - a.cx) * e, dy: (b.cy - a.cy) * e - ARC * 4 * p * (1 - p), sx: 0.9, sy: 1.12 }
  }
  // landed: squash and spring back to round
  const s = spring(u - FLIGHT, 3, 0.4)
  return { dx: b.cx - a.cx, dy: b.cy - a.cy, sx: 1.2 - 0.2 * s, sy: 0.75 + 0.25 * s }
}

export function hopRig(root: HTMLElement, prefix: string) {
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

  return makeRig((t) => {
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
  })
}
