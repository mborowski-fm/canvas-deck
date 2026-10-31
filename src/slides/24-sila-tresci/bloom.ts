/**
 * Siła treści (loop): on the rich card the clouds drift slowly, each at its own pace, and the
 * patterned flower keeps turning around its yellow center. Rest pose = the Figma design.
 */
import { around, layerFinder, makeRig } from '../motion'

const LOOP = 20 // seconds; the flower turns twice per loop
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
      flower?.setAttribute('transform', around(FLOWER.cx, FLOWER.cy, `rotate(${((t * 720) / LOOP).toFixed(2)})`))
      clouds[0]?.setAttribute('transform', `translate(${(22 * Math.sin(w)).toFixed(2)} ${(3 * Math.sin(2 * w)).toFixed(2)})`)
      clouds[1]?.setAttribute('transform', `translate(${(-30 * Math.sin(w + 1.3)).toFixed(2)} ${(2 * Math.sin(2 * w + 0.5)).toFixed(2)})`)
    },
    { loop: LOOP },
  )
}
