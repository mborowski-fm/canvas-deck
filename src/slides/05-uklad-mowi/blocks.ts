/**
 * Układ mówi, zanim zrobi to tekst (loop): the colored blocks start centered inside their grey
 * outlines, then slide to the left edge one after another; the chevrons pop in behind each
 * block as it passes, right to left, like a motion trail. They hold, then slide back to the
 * center (chevrons shrink away) and it starts again.
 * M3 Expressive feel: bouncy springs with overshoot, the blocks stretch a little with speed and
 * wobble back to shape when they stop. Rest pose = the Figma design.
 */
import { around, clamp01, layerFinder, M3, makeRig, spring, springVel, stretchBy } from '../motion'

const BLOCKS = [
  { id: 'Pattern / Shape', dx: 432, start: 1.2, chevrons: ['Vector 11', 'Vector 12', 'Vector 13', 'Vector 14', 'Vector 15'] },
  { id: 'Pattern / Shape_2', dx: 576, start: 1.42, chevrons: ['Vector 16', 'Vector 17'] },
  { id: 'Pattern / Shape_3', dx: 140, start: 1.64, chevrons: [] as string[] },
]
const OUT = [1.4, 0.62] as const // slower, still bubbly
const BACK_SPRING = [1.2, 0.7] as const // the way back: a bit calmer
const BACK = 6.0 // the blocks start going back to the center (long hold on the left)
const LOOP = 10 // long hold in the center before the next round

export function blocksRig(root: HTMLElement, prefix: string) {
  const $ = layerFinder(root, prefix)
  const blocks = BLOCKS.map((b) => {
    const el = $(b.id)
    const box = el?.getBBox()
    const chev = b.chevrons.map($).map((c) => ({ c, box: c?.getBBox() }))
    return { ...b, el, cx: box ? box.x + box.width / 2 : 0, cy: box ? box.y + box.height / 2 : 0, chev }
  })
  return makeRig(
    (t) =>
      blocks.forEach((b) => {
        if (t === null) {
          b.el?.removeAttribute('transform')
          b.chev.forEach(({ c }) => { c?.removeAttribute('opacity'); c?.removeAttribute('transform') })
          return
        }
        const back = t - BACK - (b.start - BLOCKS[0].start)
        const p = spring(t - b.start, ...OUT) - spring(back, ...BACK_SPRING)
        const speed = b.dx * (springVel(t - b.start, ...OUT) - springVel(back, ...BACK_SPRING))
        const st = stretchBy(speed, 0.00012, 0.12)
        const x = b.dx * (1 - p)
        b.el?.setAttribute('transform', `translate(${x.toFixed(2)} 0) ${around(b.cx, b.cy, `scale(${st.along.toFixed(4)} ${st.across.toFixed(4)})`)}`)
        // chevron k (right to left) pops in once the block has travelled past it
        b.chev.forEach(({ c, box }, k) => {
          const passAt = (k + 1) / (b.chev.length + 1)
          const show = t < BACK ? (p >= passAt ? 1 : 0) : clamp01(p * 1.4 - 0.3)
          // a pop: scale springs from 0.4 with overshoot (time since it was passed is not stored,
          // so use how far the block has gone beyond it)
          const s = show ? 0.4 + 0.6 * spring((p - passAt) * 1.6, ...M3.fast) : 0
          const scale = t < BACK ? s : 0.6 + 0.4 * show
          c?.setAttribute('opacity', (t < BACK ? show : show).toFixed(3))
          if (box) c?.setAttribute('transform', around(box.x + box.width / 2, box.y + box.height / 2, `scale(${scale.toFixed(4)})`))
        })
      }),
    { loop: LOOP },
  )
}
