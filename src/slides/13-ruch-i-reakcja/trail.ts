/**
 * Ruch i reakcja (loop): the patterned cursor travels left to right and leaves the solid cursors
 * of the design behind it: each one lies under the lead and is uncovered as the lead moves on (it
 * never pops in). Then it travels back right to left and covers them again, one by one.
 * M3 Expressive feel: the lead travels on a bouncy spring (small overshoot), stretching and
 * leaning with its speed. Rest pose = the Figma design.
 */
import { around, layerFinder, M3, makeRig, spring, springVel, stretchBy } from '../motion'

const SLOTS = [211, 482, 753, 1024] // left edge of each trail cursor (the design spaces them 271 apart)
const LEAD_X = 1295 // the patterned cursor in the design
const BACK_AT = 2.6 // s: it travels back
const LOOP = 5.2

const TRAVEL_SPRING = M3.lazy // a big bouncy travel: overshoots a touch and settles

export function trailRig(root: HTMLElement, prefix: string) {
  const $ = layerFinder(root, prefix)
  const lead = $('Pattern / Vector')
  const trail = ['Vector', 'Vector_2', 'Vector_3', 'Vector_4'].map($)
  const span = LEAD_X - SLOTS[0]
  const box = lead?.getBBox()
  const cx = box ? box.x + box.width / 2 : 0, cy = box ? box.y + box.height / 2 : 0

  return makeRig(
    (t) => {
      if (t === null) {
        lead?.removeAttribute('transform')
        trail.forEach((c) => { c?.removeAttribute('transform'); c?.removeAttribute('opacity') })
        return
      }
      // position of the lead along the row: 0 = first slot, 1 = its place in the design
      const p = spring(t, ...TRAVEL_SPRING) - spring(t - BACK_AT, ...TRAVEL_SPRING)
      const speed = span * (springVel(t, ...TRAVEL_SPRING) - springVel(t - BACK_AT, ...TRAVEL_SPRING))
      const st = stretchBy(speed, 0.00008, 0.12)
      const lean = Math.max(-10, Math.min(10, speed * 0.004)) // leans into the motion
      const x = SLOTS[0] + span * p
      lead?.setAttribute('transform', `translate(${(x - LEAD_X).toFixed(2)} 0) ${around(cx, cy, `rotate(${lean.toFixed(2)}) scale(${st.along.toFixed(4)} ${st.across.toFixed(4)})`)}`)
      trail.forEach((c, i) => {
        // the trail cursor lies under the lead (drawn below it): it switches on while the lead fully
        // covers it, so the moving lead uncovers it; on the way back the lead covers it again first
        const at = (SLOTS[i] - SLOTS[0]) / span
        c?.setAttribute('opacity', p >= at ? '1' : '0')
      })
    },
    { loop: LOOP },
  )
}

