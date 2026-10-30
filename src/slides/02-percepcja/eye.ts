/**
 * Percepcja idle loop: the eye glances around and blinks, like a living eye.
 * - Gaze moves in quick saccades that overshoot a touch and settle (spring), with a faint drift.
 * - Blinks close fast and open slower; the eye dips slightly while the lids are shut.
 * - Lids are tangerine shapes with a curved edge inside the eye clip; the eye is never scaled.
 * Layers (ids prefixed by SvgSlide): Iris (pattern + brown center move as one), Upper lid, Lower lid.
 */
import { clamp01, easeInQuad, easeOutCubic, runTimeline, spring } from '../motion'

const LOOP = 8 // seconds

// Fixations: [start s, dx, dy] relative to the iris position in Figma. Each one is a saccade.
const FIX: [number, number, number][] = [
  [0, 0, 0],
  [1.3, -175, -12],
  [2.9, -150, 8],
  [3.6, 165, -28],
  [5.2, 30, 10],
  [6.4, 0, 0],
]
const BLINKS = [1.22, 4.8, 7.15, 7.42] // the first rides on a big saccade; the last two are a double blink

// Lids: vertical offset when open / closed. Their edges bulge 50 px toward the middle (slide.svg),
// so closed they must overlap slightly past the center line to cover the corners of the eye too.
const LID_OPEN = 270
const LID_CLOSED = -10
const CLOSE = 0.075, HOLD = 0.04, OPEN = 0.17

/** gaze with a spring per saccade; the previous fixation is settled by the next one */
function gaze(t: number, freq: number, damping: number) {
  let x = 0, y = 0
  for (let i = 1; i < FIX.length; i++) {
    const [ts, tx, ty] = FIX[i]
    const [, px, py] = FIX[i - 1]
    const s = spring(t - ts, freq, damping)
    x += (tx - px) * s
    y += (ty - py) * s
  }
  return { x, y }
}

/** 0 = open, 1 = closed */
function closure(t: number) {
  for (const b of BLINKS) {
    const u = t - b
    if (u < 0 || u > CLOSE + HOLD + OPEN) continue
    if (u < CLOSE) return easeInQuad(u / CLOSE)
    if (u < CLOSE + HOLD) return 1
    return 1 - easeOutCubic(clamp01((u - CLOSE - HOLD) / OPEN))
  }
  return 0
}

export function eyeRig(root: HTMLElement, prefix: string) {
  const $ = (id: string) => root.querySelector<SVGGraphicsElement>(`[id="${prefix}__${id}"]`)
  const iris = $('Iris'), upper = $('Upper lid'), lower = $('Lower lid')

  const pose = (t: number | null) => {
    let g = { x: 0, y: 0 }, c = 0
    if (t !== null) {
      g = gaze(t, 3.2, 0.62) // snappy saccade, small overshoot
      const drift = { x: Math.sin(t * 1.7) * 2.5, y: Math.cos(t * 1.3) * 2 }
      c = closure(t)
      g = { x: g.x + drift.x, y: g.y + drift.y + c * 8 } // eye dips a little during a blink
    }
    const lid = LID_OPEN - (LID_OPEN - LID_CLOSED) * c
    iris?.setAttribute('transform', `translate(${g.x.toFixed(2)} ${g.y.toFixed(2)})`)
    upper?.setAttribute('transform', `translate(0 ${(-lid).toFixed(2)})`)
    lower?.setAttribute('transform', `translate(0 ${lid.toFixed(2)})`)
  }

  return {
    rest: () => pose(null),
    play: () => {
      const stop = runTimeline((t) => pose(t % LOOP), () => pose(null))
      return () => {
        stop()
        pose(null)
      }
    },
  }
}
