/**
 * Kontekst: a spotlight from one fixed point at the top. The beam's top edge stays put and its
 * foot moves, so the beam leans and becomes a skewed trapezoid; the floor spot moves with the foot.
 * - Cursor moves: the light follows the cursor (left and right), softly, a beat behind, and the
 *   block follows the light, so it always stays in the spotlight.
 * - Cursor idle (still for IDLE s, or outside the window): it animates by itself, as before: the
 *   element glides left and right (a hard block: firm, no sway) and the light follows it.
 * Both are driven by springs integrated per frame, so switching between the two is smooth.
 * Interactive: it follows each presenter's own cursor (a follower does not see that part).
 * Rest pose = the Figma design.
 */
import { layerFinder, runTimeline, type Rig } from '../motion'

const STOPS: [number, number][] = [[0, 0], [1.2, -360], [3.6, -120], [5.2, 0]] // idle loop: [time s, element dx px]; further left would cover the title
const LOOP = 7
const IDLE = 1.6 // s without cursor movement before it animates by itself
const FOOT = 1344 // beam foot center x (and the element's center) in the design
const LIGHT_MIN = -360, LIGHT_MAX = 380 // how far the light (and the block in it) may travel; further left would cover the title
const ELEMENT = { freq: 0.75, damp: 0.85 } // firm, calm glide: the block is a hard object
const LIGHT = { freq: 1.1, damp: 0.72 } // the light: soft, a touch of overshoot

/** idle target of the element at u seconds into the idle loop */
function idleTarget(u: number) {
  const v = u % LOOP
  let x = 0
  for (const [at, dx] of STOPS) if (v >= at) x = dx
  return x
}

type Spring1 = { x: number; v: number }
const step = (s: Spring1, target: number, freq: number, damp: number, dt: number) => {
  const w = 2 * Math.PI * freq
  s.v += (w * w * (target - s.x) - 2 * damp * w * s.v) * dt
  s.x += s.v * dt
}

export function spotlightRig(root: HTMLElement, prefix: string): Rig {
  const $ = layerFinder(root, prefix)
  const beam = $('Rectangle 89')
  const spot = $('Ellipse 9')
  const thing = $('Pattern / Rectangle 90')
  const d0 = beam?.getAttribute('d') ?? ''
  const rest = () => {
    if (d0) beam?.setAttribute('d', d0)
    spot?.removeAttribute('transform')
    thing?.removeAttribute('transform')
  }
  return {
    rest,
    play: () => {
      const svg = root.querySelector('svg')
      let cursorX: number | null = null
      let movedAt = -Infinity
      const onMove = (e: PointerEvent) => {
        const m = svg?.getScreenCTM()
        if (!m) return
        cursorX = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()).x
        movedAt = performance.now()
      }
      const onLeave = () => { movedAt = -Infinity }
      window.addEventListener('pointermove', onMove)
      document.addEventListener('pointerleave', onLeave)

      const el: Spring1 = { x: 0, v: 0 }
      const light: Spring1 = { x: 0, v: 0 }
      let last = 0
      let idleFrom = 0
      const stop = runTimeline((t) => {
        const dt = Math.min(0.05, Math.max(0, t - last))
        last = t
        const idle = cursorX === null || (performance.now() - movedAt) / 1000 > IDLE
        if (!idle) idleFrom = t
        // idle: the element glides by itself and the light follows it; following: the light goes
        // to the cursor and the element follows the light, so it always stays in the spotlight
        const follow = Math.max(LIGHT_MIN, Math.min(LIGHT_MAX, (cursorX ?? FOOT) - FOOT))
        step(el, idle ? idleTarget(t - idleFrom) : follow, ELEMENT.freq, ELEMENT.damp, dt)
        step(light, idle ? el.x : follow, LIGHT.freq, LIGHT.damp, dt)
        const lx = light.x
        beam?.setAttribute('d', `M1110.67 0H1577.33L${(1744 + lx).toFixed(2)} 703H${(944 + lx).toFixed(2)}L1110.67 0Z`)
        spot?.setAttribute('transform', `translate(${lx.toFixed(2)} 0)`)
        thing?.setAttribute('transform', `translate(${el.x.toFixed(2)} 0)`)
      }, rest)
      return () => {
        stop()
        window.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerleave', onLeave)
        rest()
      }
    },
  }
}
