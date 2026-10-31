/**
 * Ciężko policzyć, animuj (one-shot): the flasks first stand on the ground at the bottom of the
 * slide. Then the podium blocks rise slowly from below one by one (third place, second, then the
 * winner in the middle) and lift the flasks; each flask rocks a little when it is picked up and
 * when its block stops. Blocks are heavy (firm, slow spring).
 * Rest pose = the Figma design.
 */
import { around, layerFinder, makeRig, spring, wobble } from '../motion'

const SLIDE_H = 1080
const GAP = 90 // the block starts this far below the flask, so you see it arrive
const PODIUM = [
  { block: 'Rectangle 127', top: 952, flask: 'Pattern / science', cx: 448, start: 0.8 }, // third
  { block: 'Rectangle 129', top: 868, flask: 'Pattern / science_3', cx: 1472, start: 2.0 }, // second
  { block: 'Rectangle 128', top: 804, flask: 'Pattern / science_2', cx: 960, start: 3.2 }, // first
]
const RISE = { freq: 0.55, damping: 0.86 } // slow and heavy

export function podiumRig(root: HTMLElement, prefix: string) {
  const $ = layerFinder(root, prefix)
  // ground = the flask's bottom on the slide's bottom edge; the block starts GAP below that
  const parts = PODIUM.map((p) => ({ ...p, b: $(p.block), f: $(p.flask), ground: SLIDE_H - p.top, depth: SLIDE_H - p.top + GAP }))
  return makeRig(
    (t) =>
      parts.forEach((p) => {
        if (t === null) {
          p.b?.removeAttribute('transform')
          p.f?.removeAttribute('transform')
          return
        }
        const u = t - p.start
        const y = p.depth * (1 - spring(u, RISE.freq, RISE.damping))
        // the flask stands on the ground until the block reaches it, then rides on top
        const fy = Math.min(p.ground, y)
        const contact = u - invRise(1 - p.ground / p.depth)
        const tilt = (y < p.ground ? wobble(contact, 3, 1.4, 3) : 0) + wobble(u - 1.6, 3, 1.2, 2.6)
        p.b?.setAttribute('transform', `translate(0 ${y.toFixed(2)})`)
        p.f?.setAttribute('transform', `translate(0 ${fy.toFixed(2)}) ${around(p.cx, p.top, `rotate(${tilt.toFixed(2)})`)}`)
      }),
    { end: 7 },
  )
}

/** seconds until the rise spring first reaches progress q (bisection) */
function invRise(q: number) {
  let lo = 0, hi = 4
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (spring(mid, RISE.freq, RISE.damping) < q) lo = mid
    else hi = mid
  }
  return hi
}
