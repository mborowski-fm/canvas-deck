/**
 * Siła treści (loop): on the rich card the clouds drift slowly, each at its own pace, and the
 * patterned flower now and then makes one slow full turn around its yellow center. Rest pose = the Figma design.
 */
import { around, layerFinder, makeRig, spring } from '../motion'

const LOOP = 20 // seconds
const TURN_EVERY = 10 // s: now and then the flower makes one full, slow turn
const TURN = 360
const TURN_SPRING = [0.32, 0.8] as const // slow: about 3 s, settles softly
const FLOWER = { cx: 1280, cy: 539 }

export function bloomRig(root: HTMLElement, prefix: string) {
  const $ = layerFinder(root, prefix)
  const flower = $('Pattern / filter_vintage')
  const clouds = [$('cloud'), $('cloud_2')]
  return makeRig(
    (t) => {
      if (t === null) {
        ;[flower, ...clouds].forEach((e) => e?.removeAttribute('transform'))
        return
      }
      const w = (2 * Math.PI * t) / LOOP
      // now and then a slow full turn, puffing up a touch while it turns
      const k = Math.floor(t / TURN_EVERY)
      const u = t - k * TURN_EVERY - 2 // waits 2 s, then turns
      const p = spring(u, ...TURN_SPRING)
      const rot = TURN * p
      const puff = 1 + 0.04 * Math.sin(Math.min(1, Math.max(0, p)) * Math.PI)
      flower?.setAttribute('transform', around(FLOWER.cx, FLOWER.cy, `rotate(${rot.toFixed(2)}) scale(${puff.toFixed(4)})`))
      clouds[0]?.setAttribute('transform', `translate(${(22 * Math.sin(w)).toFixed(2)} ${(3 * Math.sin(2 * w)).toFixed(2)})`)
      clouds[1]?.setAttribute('transform', `translate(${(-30 * Math.sin(w + 1.3)).toFixed(2)} ${(2 * Math.sin(2 * w + 0.5)).toFixed(2)})`)
    },
    { loop: LOOP },
  )
}
