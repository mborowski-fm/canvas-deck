/**
 * Typografia (loop): a text caret blinks right after the title, like an editor waiting for input.
 * The caret is drawn in code (ink color, the title's height) and fades in and out softly.
 */
import { layerFinder, makeRig } from '../motion'

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
      // on for half the cycle, off for the other half, with short soft fades
      const u = (t % BLINK) / BLINK
      const o = u < 0.45 ? 1 : u < 0.5 ? 1 - (u - 0.45) / 0.05 : u < 0.95 ? 0 : (u - 0.95) / 0.05
      caret.setAttribute('opacity', o.toFixed(3))
    },
    { loop: BLINK },
  )
}
