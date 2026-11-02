/**
 * Typografia (loop): a text caret blinks right after the title, like an editor waiting for input.
 * The caret is drawn in code (ink color, the title's height): it fades out softly and pops back
 * in with a small bubbly stretch.
 */
import { layerFinder, makeRig, wobble } from '../motion'

const BLINK = 1.06 // seconds per on/off cycle, like a system caret
const SVG_NS = 'http://www.w3.org/2000/svg'

export function caretRig(root: HTMLElement, prefix: string) {
  const title = layerFinder(root, prefix)('Typografia') as SVGTextElement | null
  let caret = root.querySelector<SVGRectElement>('[data-caret]')
  if (title && !caret) {
    caret = document.createElementNS(SVG_NS, 'rect')
    caret.setAttribute('data-caret', '')
    caret.setAttribute('fill', title.getAttribute('fill') ?? '#44441A')
    title.after(caret)
  }
  const place = () => {
    if (!title || !caret) return
    const b = title.getBBox()
    caret.setAttribute('x', String(b.x + b.width + 14))
    caret.setAttribute('y', String(b.y + b.height * 0.12))
    caret.setAttribute('width', '10')
    caret.setAttribute('height', String(b.height * 0.8))
  }
  return makeRig(
    (t) => {
      if (!caret) return
      if (t === null) return caret.setAttribute('opacity', '0')
      if (t < 0.05) place() // fonts may load late: measure at the start of each cycle
      // on for half the cycle, off for the other half; it fades out softly and pops back in with
      // a small bubbly stretch (M3 Expressive)
      const u = t % BLINK
      const on = u < BLINK * 0.5
      const o = on ? 1 : u < BLINK * 0.62 ? 0.5 + 0.5 * Math.cos(((u - BLINK * 0.5) / (BLINK * 0.12)) * Math.PI) : 0
      const sy = on ? 1 + wobble(u, 0.12, 3, 7) : 1
      caret.setAttribute('opacity', o.toFixed(3))
      const h = +(caret.getAttribute('height') ?? 0), y = +(caret.getAttribute('y') ?? 0)
      caret.setAttribute('transform', `translate(0 ${(y + h / 2).toFixed(1)}) scale(1 ${sy.toFixed(4)}) translate(0 ${(-(y + h / 2)).toFixed(1)})`)
    },
    { loop: BLINK },
  )
}
