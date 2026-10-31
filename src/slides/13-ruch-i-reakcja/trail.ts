/**
 * Ruch i reakcja (loop): the patterned cursor travels left to right and leaves the solid cursors
 * of the design behind it: each one lies under the lead and is uncovered as the lead moves on (it
 * never pops in). Then it travels back right to left and covers them again, one by one.
 * Rest pose = the Figma design.
 */
import { clamp01, layerFinder, makeRig } from '../motion'

const SLOTS = [211, 482, 753, 1024] // left edge of each trail cursor (the design spaces them 271 apart)
const LEAD_X = 1295 // the patterned cursor in the design
const TRAVEL = 1.7 // seconds per direction
const HOLD = 0.6
const LOOP = 2 * (TRAVEL + HOLD)

/** eased travel 0..1 (quick start, soft arrival) */
const travel = (u: number) => {
  const x = clamp01(u)
  return 1 - (1 - x) ** 3
}

export function trailRig(root: HTMLElement, prefix: string) {
  const $ = layerFinder(root, prefix)
  const lead = $('Pattern / Vector')
  const trail = ['Vector', 'Vector_2', 'Vector_3', 'Vector_4'].map($)
  const span = LEAD_X - SLOTS[0]

  return makeRig(
    (t) => {
      if (t === null) {
        lead?.removeAttribute('transform')
        trail.forEach((c) => { c?.removeAttribute('transform'); c?.removeAttribute('opacity') })
        return
      }
      // position of the lead along the row: 0 = first slot, 1 = its place in the design
      let p: number
      if (t < TRAVEL) p = travel(t / TRAVEL)
      else if (t < TRAVEL + HOLD) p = 1
      else if (t < 2 * TRAVEL + HOLD) { p = 1 - travel((t - TRAVEL - HOLD) / TRAVEL) }
      else p = 0
      const x = SLOTS[0] + span * p
      lead?.setAttribute('transform', `translate(${(x - LEAD_X).toFixed(2)} 0)`)
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

