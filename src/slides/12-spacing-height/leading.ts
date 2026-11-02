/**
 * Spacing, height itd. (loop): line height matters. The paragraph starts cramped (100%, the
 * lines nearly touch), then opens up to the designed 150% and rests there for a while; then it
 * closes again and the loop repeats. Each colored dashed line stays right under its text line.
 * Motion feels like the eye on slide 02: a quick spring with a small overshoot that settles, and a faint "breathing" while it rests, so it never freezes.
 * Only the line positions move (centered), so the text never reflows.
 * Rest pose = the Figma design (150%).
 */
import { layerFinder, makeRig, spring } from '../motion'

const SIZE = 64 // font size
const TEXT_CENTER = 643.8 // baseline of the middle text line in the design
const UNDERLINE = 8.2 // each dashed line sits this far under its text baseline (Figma)
const GUIDES = ['Line 7', 'Line 8', 'Line 9', 'Line 10', 'Line 11']
const TIGHT = 1.0 // cramped line height
const OPEN = 1.5 // the designed line height (150%)
const OPEN_AT = 1.2 // s: cramped hold, then it opens
const CLOSE_AT = 6.4 // s: rests open for a long while, then closes
const LOOP = 8
const OPEN_SPRING = [1.6, 0.62] as const // decisive start, small overshoot, soft settle
const CLOSE_SPRING = [1.4, 0.7] as const // a touch calmer on the way back

/** line height factor at time t */
function leading(t: number) {
  const open = spring(t - OPEN_AT, ...OPEN_SPRING)
  const close = spring(t - CLOSE_AT, ...CLOSE_SPRING)
  const openness = open - close
  const breathe = 0.008 * Math.sin((t - OPEN_AT) * 1.6) * Math.max(0, Math.min(1, openness))
  return TIGHT + (OPEN - TIGHT) * openness + breathe
}

export function leadingRig(root: HTMLElement, prefix: string) {
  const $ = layerFinder(root, prefix)
  const text = $('Paragraph')
  const lines = text ? [...text.querySelectorAll('tspan')] : []
  const guides = GUIDES.map($)
  const mid = (lines.length - 1) / 2
  const place = (lh: number) => {
    lines.forEach((l, i) => {
      const base = TEXT_CENTER + (i - mid) * SIZE * lh
      l.setAttribute('y', base.toFixed(2))
      // its dashed line always stays right under it
      const y = (base + UNDERLINE).toFixed(2)
      guides[i]?.setAttribute('y1', y)
      guides[i]?.setAttribute('y2', y)
    })
  }
  return makeRig((t) => place(t === null ? OPEN : leading(t)), { loop: LOOP })
}
