/**
 * Spacing, height itd. (loop): the patterned fox jumps in from the left onto the first text
 * column, then onto the second one (above the two orange lines, where it stays the longest),
 * then out of the frame on the right. Soft: a small crouch before each jump, eased arcs, and
 * a squash on landing that settles with a spring. Two grey foxes in slide.svg mark the
 * landing spots for good.
 * Rest pose = the Figma design (fox on the left column, facing left).
 */
import { around, layerFinder, makeRig, wobble } from '../motion'

const Y = 392 // fox box top when it stands on a column (as in Figma)
const OFF_L = -360
const LEFT = 368 // the first column (Figma position)
const RIGHT = 1232 // the second column, above the orange lines
const OFF_R = 1960
const CROUCH = 0.16 // s, before each jump
// [from x, to x, start time, time in the air, arc height]
const HOPS = [
  [OFF_L, LEFT, 0.4, 0.75, 160],
  [LEFT, RIGHT, 2.2, 0.85, 240],
  [RIGHT, OFF_R, 5.8, 0.75, 160], // the longest stop is above the orange lines
] as const
const LOOP = 7.6

const easeInOut = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u)

function foxAt(t: number) {
  let x = OFF_L
  for (let i = 0; i < HOPS.length; i++) {
    const [from, to, at, dur, h] = HOPS[i]
    const u = t - at
    if (u < 0) break
    if (u < CROUCH) {
      // crouch: squash down toward the feet
      const k = Math.sin((u / CROUCH) * (Math.PI / 2))
      return { x: from, y: Y, sx: 1 + 0.05 * k, sy: 1 - 0.1 * k }
    }
    const a = (u - CROUCH) / dur
    if (a < 1) {
      // in the air: eased travel, stretched at take-off, back to normal at the top
      const s = easeInOut(a)
      return { x: from + (to - from) * s, y: Y - 4 * h * a * (1 - a), sx: 1 - 0.04 * (1 - a), sy: 1 + 0.08 * (1 - a) }
    }
    x = to
    if (t < (HOPS[i + 1]?.[2] ?? Infinity)) {
      // landed: soft squash that settles before the next crouch
      const sq = wobble(u - CROUCH - dur + 0.05, 0.1, 2.4, 6)
      return { x, y: Y, sx: 1 + sq * 0.6, sy: 1 - sq }
    }
  }
  return { x, y: Y, sx: 1, sy: 1 }
}

export function foxRig(root: HTMLElement, prefix: string) {
  const $ = layerFinder(root, prefix)
  const fox = $('Fox')
  const body = $('Fox body')
  return makeRig(
    (t) => {
      if (t === null) {
        fox?.setAttribute('transform', `translate(${LEFT} ${Y})`)
        body?.removeAttribute('transform')
        return
      }
      const p = foxAt(t)
      // squash and stretch around the feet (bottom center of the 320×180 box)
      fox?.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) ${around(160, 180, `scale(${p.sx.toFixed(4)} ${p.sy.toFixed(4)})`)}`)
      body?.setAttribute('transform', 'translate(320 0) scale(-1 1)') // faces the way it jumps
    },
    { loop: LOOP },
  )
}
