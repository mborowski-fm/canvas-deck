/**
 * Puste miejsce też się projektuje, after Marcin's four key frames:
 * 1. A lime wall (left) and a magenta wall (right) stand still, touching the heart in the middle.
 * 2. The heart travels left, pushing the lime wall twice, to about 1/3 of the slide; the third
 *    strike knocks the wall out (fastest at the hit, slowing down as it goes, fully opaque).
 * 3. The heart crosses to the right; the magenta wall moves only once the heart reaches it.
 *    The heart pushes it twice to about 2/3 of the slide and the third strike knocks it out,
 *    a bit slower than the first exit.
 * 4. The heart returns to the middle and beats (lub-dub). Only this step loops; Replay starts
 *    again from the walls.
 * The heart is the active side and the walls only react: before each push the heart winds up
 * (eases back and crouches), then lunges into the wall stretched in its direction; the wall gives
 * way a beat later and slower. The walls never move by themselves. The text stays on top. Walls
 * are drawn in code.
 * Rest pose = the Figma design (no walls).
 */
import { around, clamp01, easeOutCubic, layerFinder, makeRig, spring } from '../motion'

const C = { x: 960, y: 540 } // heart center
const HALF = 57 // half the heart width: the walls touch it here
const STEP = 160 // one push; two of them take the heart to 1/3 (or 2/3) of the slide
// per wall: two pushes, and the third strike knocks it out
const LEFT = { pushes: [0.8, 1.45], hit: 2.5, exit: 0.7 }
const CROSS = 3.1 // the heart glides back to where it touches the magenta wall
const RIGHT = { pushes: [4.3, 4.95], hit: 6.0, exit: 1.2 } // the last exit is a bit slower
const HOME = 6.7 // the heart returns to the middle
const BEAT_FROM = 7.9 // alone from here on: lub-dub, looping
const BEAT_EVERY = 1.0
const OUT = 1300 // px a wall travels after the hit
const PUSH_SPRING = [2.2, 0.92] as const // the wall gives way slower than the heart moves, no drift
const GLIDE = [0.8, 0.88] as const // free movement of the heart
const WALLS = [
  { x: -40, w: C.x - HALF + 40, fill: '#E2F79A' }, // color/lime, left (from past the edge to the heart)
  { x: C.x + HALF, w: 1920 - C.x - HALF + 40, fill: '#E84ACF' }, // color/magenta, right
]

const pulse = (u: number, w = 0.08) => (u < 0 ? 0 : Math.exp(-((u / w) ** 2)))
const WIND = 0.2 // wind-up before each push
const HIT_WIND = 0.55 // the knockout strike gets a long run-up: slow pull back, then a fast lunge
const HIT_BACK = 80 // px the heart pulls back before it
/** knockout wind-up: eases out to 1 until just before the hit, then snaps back to 0 */
const hitWind = (u: number) => {
  if (u <= -HIT_WIND || u >= 0.03) return 0
  if (u < -0.09) return easeOutCubic((u + HIT_WIND) / (HIT_WIND - 0.09))
  return 1 - (u + 0.09) / 0.12
}
const LAG = 0.06 // the wall starts moving only after the heart hits it
/** wind-up curve: 0 -> 1 -> 0 over the WIND seconds before t = 0 */
const windUp = (u: number) => (u > -WIND && u < 0.05 ? Math.sin(((u + WIND) / (WIND + 0.05)) * Math.PI) : 0)
/** how far the wall has been pushed: it follows the heart a beat later and slower */
const wallPushed = (t: number, pushes: number[]) => pushes.reduce((d, p) => d + STEP * spring(t - p - LAG, ...PUSH_SPRING), 0)
const LEAD = 12 // px the heart presses into the wall ahead of it (visible push, no overlap)
/** how far the heart has moved: it leads (faster, at most LEAD ahead of the wall) and pulls back a little before each push */
const heartPushed = (t: number, pushes: number[]) => {
  const raw = pushes.reduce((d, p) => d + STEP * spring(t - p, 3.4, 0.82) - 14 * windUp(t - p), 0)
  return Math.min(raw, wallPushed(t, pushes) + LEAD)
}
/** the wall knocked out by the hit: fastest at the hit, slowing down until it is off the slide (fully opaque all the way) */
const knocked = (t: number, hit: number, exit: number) => OUT * easeOutCubic(clamp01((t - hit - LAG) / exit))

/** heart position along x, relative to the middle */
function heartX(t: number) {
  const span = STEP * LEFT.pushes.length
  return (
    -heartPushed(t, LEFT.pushes) + // pushing the lime wall to the left
    HIT_BACK * hitWind(t - LEFT.hit) + // long run-up (away from the wall) before the hit
    span * spring(t - CROSS, ...GLIDE) + // back to the magenta wall
    heartPushed(t, RIGHT.pushes) - // pushing the magenta wall to the right
    HIT_BACK * hitWind(t - RIGHT.hit) - // long run-up before the hit
    span * spring(t - HOME, ...GLIDE) // home to the middle
  )
}

export function heartRig(root: HTMLElement, prefix: string) {
  const heart = layerFinder(root, prefix)('Pattern / Vector')
  // the two walls, drawn once, above the background and below the text and the heart.
  // Looked up by side (not DOM order), so the lime one always moves left and the magenta one right.
  const bg = root.querySelector('svg rect')
  const walls = (['left', 'right'] as const).map((side, i) => {
    let r = root.querySelector<SVGRectElement>(`[data-wall="${side}"]`)
    if (!r && heart) {
      const w = WALLS[i]
      r = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      r.setAttribute('data-wall', side)
      Object.entries({ x: w.x, y: -40, width: w.w, height: 1160, fill: w.fill }).forEach(([k, v]) => r!.setAttribute(k, String(v)))
      bg?.after(r)
    }
    return r
  })

  return makeRig((t) => {
    if (t === null) {
      heart?.removeAttribute('transform')
      walls.forEach((w) => w?.setAttribute('opacity', '0'))
      return
    }
    const x = heartX(t)
    // the heart acts: crouches while winding up, stretches toward the wall as it lunges
    let sx = 1, sy = 1
    for (const p of [...LEFT.pushes, ...RIGHT.pushes]) {
      const w = windUp(t - p), l = pulse(t - p - 0.04, 0.07)
      sx += -0.08 * w + 0.16 * l
      sy += 0.06 * w - 0.08 * l
    }
    for (const h of [LEFT.hit, RIGHT.hit]) {
      const w = hitWind(t - h), l = pulse(t - h - 0.03, 0.08)
      sx += -0.14 * w + 0.32 * l
      sy += 0.1 * w - 0.12 * l
    }
    if (t >= BEAT_FROM) {
      const u = (t - BEAT_FROM) % BEAT_EVERY
      const k = 0.18 * pulse(u, 0.07) + 0.1 * pulse(u - 0.25, 0.07)
      sx += k
      sy += k
    }
    heart?.setAttribute('transform', `translate(${x.toFixed(2)} 0) ${around(C.x, C.y, `scale(${sx.toFixed(4)} ${sy.toFixed(4)})`)}`)
    // walls: moved only by the heart (contact while pushed), then knocked out by the hit
    const left = -wallPushed(t, LEFT.pushes) - knocked(t, LEFT.hit, LEFT.exit)
    const right = wallPushed(t, RIGHT.pushes) + knocked(t, RIGHT.hit, RIGHT.exit)
    ;[left, right].forEach((d, i) => {
      walls[i]?.setAttribute('opacity', '1')
      walls[i]?.setAttribute('transform', `translate(${d.toFixed(2)} 0)`)
    })
  })
}
