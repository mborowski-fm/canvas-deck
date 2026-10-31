/**
 * Układ mówi, zanim zrobi to tekst (loop): the colored blocks start centered inside their grey
 * outlines, then slide to the left edge one after another; the chevrons light up behind each
 * block as it passes, right to left, like a motion trail. They hold, then slide back to the
 * center (chevrons fade) and it starts again. Rest pose = the Figma design.
 */
import { clamp01, layerFinder, makeRig, spring } from '../motion'

const BLOCKS = [
  { id: 'Pattern / Shape', dx: 432, start: 0.7, chevrons: ['Vector 11', 'Vector 12', 'Vector 13', 'Vector 14', 'Vector 15'] },
  { id: 'Pattern / Shape_2', dx: 576, start: 0.82, chevrons: ['Vector 16', 'Vector 17'] },
  { id: 'Pattern / Shape_3', dx: 140, start: 0.94, chevrons: [] as string[] },
]
const MOVE = { freq: 1.5, damping: 0.72 } // a decisive slide with a small settle
const BACK = 3.6 // the blocks start going back to the center
const LOOP = 5.6

export function blocksRig(root: HTMLElement, prefix: string) {
  const $ = layerFinder(root, prefix)
  const blocks = BLOCKS.map((b) => ({ ...b, el: $(b.id), chev: b.chevrons.map($) }))
  return makeRig(
    (t) =>
      blocks.forEach((b) => {
        const p = t === null ? 1 : spring(t - b.start, MOVE.freq, MOVE.damping) - spring(t - BACK - (b.start - BLOCKS[0].start), MOVE.freq, MOVE.damping + 0.1)
        if (p >= 1 && t === null) b.el?.removeAttribute('transform')
        else b.el?.setAttribute('transform', `translate(${(b.dx * (1 - p)).toFixed(2)} 0)`)
        // chevron k (right to left) appears once the block has travelled past it
        b.chev.forEach((c, k) => {
          const show = t === null ? 1 : t < BACK ? clamp01((p - (k + 1) / (b.chev.length + 1)) * 6) : clamp01(p * 1.5 - 0.3)
          c?.setAttribute('opacity', show.toFixed(3))
          c?.setAttribute('transform', `translate(${(14 * (1 - show)).toFixed(2)} 0)`)
        })
      }),
    { loop: LOOP },
  )
}
