/**
 * Hej UI! (loop): the smiling face in the middle now and then hops for joy, like it is
 * answering "Dobry?". Anticipation (small crouch), a quick hop with a little tilt, a soft
 * squash on landing that settles with a spring. Between hops everything stands still.
 * One cycle: a single hop, a pause, a double hop, a pause.
 * Rest pose = the Figma design.
 */
import { around, layerFinder, makeRig, wobble } from '../motion'

const CX = 960 // the smiling face: center x
const BOTTOM = 788 // its bottom edge (scale around the feet)
const CROUCH = 0.12 // s
const AIR = 0.4 // s
// [start time, hop height, tilt in degrees]
const HOPS = [
  [0.8, 70, -5],
  [3.6, 46, 4],
  [4.2, 34, -3],
] as const
const LOOP = 6.4

function hop(u: number, h: number, tilt: number) {
  if (u < 0) return { y: 0, sx: 1, sy: 1, r: 0 }
  if (u < CROUCH) {
    const k = Math.sin((u / CROUCH) * (Math.PI / 2))
    return { y: 0, sx: 1 + 0.06 * k, sy: 1 - 0.08 * k, r: 0 }
  }
  const a = u - CROUCH
  if (a < AIR) {
    const s = a / AIR
    const lift = 4 * s * (1 - s)
    return { y: -h * lift, sx: 1 - 0.03 * (1 - s), sy: 1 + 0.06 * (1 - s), r: tilt * Math.sin(s * Math.PI) }
  }
  const l = a - AIR // landed: soft squash that settles
  const sq = wobble(l + 0.06, 0.09, 2.6, 7)
  return { y: 0, sx: 1 + sq * 0.7, sy: 1 - sq, r: 0 }
}

export function smileRig(root: HTMLElement, prefix: string) {
  const face = layerFinder(root, prefix)('Pattern / mood')
  return makeRig(
    (t) => {
      if (t === null) {
        face?.removeAttribute('transform')
        return
      }
      let y = 0, sx = 1, sy = 1, r = 0
      for (const [at, h, tilt] of HOPS) {
        const p = hop(t - at, h, tilt)
        y += p.y
        sx *= p.sx
        sy *= p.sy
        r += p.r
      }
      face?.setAttribute('transform', `translate(0 ${y.toFixed(2)}) ${around(CX, BOTTOM, `rotate(${r.toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)})`)}`)
    },
    { loop: LOOP },
  )
}
