/**
 * Kontekst (loop): the element in the spotlight drifts left and right, and the light follows it.
 * The light comes from one fixed point at the top, so the beam's top edge stays put while its
 * foot follows the element: the beam leans and becomes a skewed trapezoid. The floor spot moves
 * with the element. Rest pose = the Figma design.
 */
import { layerFinder, makeRig, spring } from '../motion'

const STOPS: [number, number][] = [[0, 0], [1.2, -360], [3.6, -120], [5.2, 0]] // [time s, dx px]; further left would cover the title
const LOOP = 7

const dxAt = (t: number) => {
  let x = 0
  for (let i = 1; i < STOPS.length; i++) x += (STOPS[i][1] - STOPS[i - 1][1]) * spring(t - STOPS[i][0], 0.7, 0.85)
  return x
}

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
      // top edge fixed at the light source, foot follows the element
      beam?.setAttribute('d', `M1110.67 0H1577.33L${(1744 + dx).toFixed(2)} 703H${(944 + dx).toFixed(2)}L1110.67 0Z`)
      spot?.setAttribute('transform', `translate(${dx.toFixed(2)} 0)`)
      thing?.setAttribute('transform', `translate(${dx.toFixed(2)} 0)`)
    },
    { loop: LOOP },
  )
}
