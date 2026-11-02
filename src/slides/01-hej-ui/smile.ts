/**
 * Hej UI! (loop): once in a while the smiling face in the middle hops for joy, like it is
 * answering "Dobry?". One smooth motion, no separate phases: it rises on a soft spring, floats
 * back down on a second one, and where the fall would carry it below the floor it squashes
 * instead, then wobbles back to round like jelly. Squash and stretch follow its speed, so every
 * part flows into the next (M3 Expressive). Between hops it stands still.
 * Rest pose = the Figma design.
 */
import { around, layerFinder, makeRig, spring, springVel } from '../motion'

const CX = 960 // the smiling face: center x
const BOTTOM = 788 // its bottom edge (scale around the feet)
const SIZE = 412
const HOP_AT = 1.2 // s
const HEIGHT = 80 // px
const AIR = 0.38 // s between the rise and the fall
const RISE = [1.5, 0.75] as const
const FALL = [1.6, 0.42] as const // lands with a soft bounce into the floor (turned into squash)
const TILT = -4 // degrees, at the top of the hop
const LOOP = 7

export function smileRig(root: HTMLElement, prefix: string) {
  const face = layerFinder(root, prefix)('Pattern / mood')
  return makeRig(
    (t) => {
      if (t === null) {
        face?.removeAttribute('transform')
        return
      }
      const u = t - HOP_AT
      // height above the floor: up on one spring, down on another (negative = pressed into the floor)
      const lift = HEIGHT * (spring(u, ...RISE) - spring(u - AIR, ...FALL))
      const v = HEIGHT * (springVel(u, ...RISE) - springVel(u - AIR, ...FALL)) // px/s, + = going up
      const y = Math.max(0, lift)
      // stretch with speed in the air; squash where the fall would go below the floor
      const stretch = Math.min(0.12, Math.abs(v) * 0.00045) * (lift > 0 ? 1 : 0)
      const squash = lift < 0 ? Math.min(0.2, (-lift / SIZE) * 6) : 0
      const sy = 1 + stretch - squash
      const sx = 1 / Math.sqrt(sy) // keep the volume
      const r = TILT * Math.max(0, Math.min(1, lift / HEIGHT))
      face?.setAttribute('transform', `translate(0 ${(-y).toFixed(2)}) ${around(CX, BOTTOM, `rotate(${r.toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)})`)}`)
    },
    { loop: LOOP },
  )
}
