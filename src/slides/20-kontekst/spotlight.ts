/**
 * Kontekst (loop): the element in the spotlight drifts left and right, and the light follows it.
 * The light comes from one fixed point at the top, so the beam's top edge stays put while its
 * foot follows the element: the beam leans and becomes a skewed trapezoid. The floor spot moves
 * with the element. The element is a hard block: it glides firmly, without swaying; the light
 * follows it a beat later. Rest pose = the Figma design.
 */
import { layerFinder, makeRig, spring } from '../motion'

const STOPS: [number, number][] = [[0, 0], [1.2, -360], [3.6, -120], [5.2, 0]] // [time s, dx px]; further left would cover the title
const LOOP = 7

const dxAt = (t: number) => {
  let x = 0
  for (let i = 1; i < STOPS.length; i++) x += (STOPS[i][1] - STOPS[i - 1][1]) * spring(t - STOPS[i][0], ...MOVE)
  return x
}
const MOVE = [0.75, 0.85] as const // a firm, calm glide: the block is a hard object
const LAG = 0.12 // s: the light follows a beat later and catches up softly

export function spotlightRig(root: HTMLElement, prefix: string) {
  const $ = layerFinder(root, prefix)
  const beam = $('Rectangle 89')
  const spot = $('Ellipse 9')
  const thing = $('Pattern / Rectangle 90')
  const d0 = beam?.getAttribute('d') ?? ''
  return makeRig(
    (t) => {
      if (t === null) {
        if (d0) beam?.setAttribute('d', d0)
        spot?.removeAttribute('transform')
        thing?.removeAttribute('transform')
        return
      }
      const dx = dxAt(t)
      const lx = dxAt(t - LAG) // the light trails the element a little
      // top edge fixed at the light source, foot follows the element
      beam?.setAttribute('d', `M1110.67 0H1577.33L${(1744 + lx).toFixed(2)} 703H${(944 + lx).toFixed(2)}L1110.67 0Z`)
      spot?.setAttribute('transform', `translate(${lx.toFixed(2)} 0)`)
      thing?.setAttribute('transform', `translate(${dx.toFixed(2)} 0)`)
    },
    { loop: LOOP },
  )
}
