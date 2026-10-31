/**
 * Jest ważna (loop): each box keeps its vibe and shows five fonts of it: first box standard
 * sans fonts, second serious serifs, third playful display fonts. A swap is a calm crossfade:
 * the letter fades out sliding down a touch, the font changes, it fades in from above. The
 * boxes take turns so it reads as a rhythm. Rest pose = the Figma design.
 */
import { clamp01, easeOutCubic, layerFinder, makeRig } from '../motion'

const BOXES = [
  { id: 'T', fonts: ['Inter', 'Google Sans Flex', 'Roboto', 'Figtree', 'DM Sans'] }, // standard
  { id: 'T_2', fonts: ['Times New Roman', 'Playfair Display', 'Libre Baskerville', 'EB Garamond', 'DM Serif Display'] }, // serious serif
  { id: 'T_3', fonts: ['Courier New', 'Lobster', 'Pacifico', 'Bungee', 'Chewy'] }, // playful
]
const STEP = 1.6 // seconds per font
const STAGGER = 0.3 // boxes swap one after another
const OUT = 0.18 // fade-out before the swap
const IN = 0.3 // fade-in after it
const SLIDE = 14 // px the letter travels while fading

export function fontsRig(root: HTMLElement, prefix: string) {
  const $ = layerFinder(root, prefix)
  const boxes = BOXES.map((b) => {
    const el = $(b.id) as SVGTextElement | null
    const span = el?.querySelector('tspan')
    // center each letter on its box, so fonts of different widths stay centered
    const bb = el?.getBBox()
    return { ...b, el, span, cx: bb ? bb.x + bb.width / 2 : 0, cy: bb ? bb.y + bb.height / 2 : 0, x0: span?.getAttribute('x') ?? '0', current: -1 }
  })
  const LOOP = STEP * 5

  return makeRig(
    (t) =>
      boxes.forEach((b, i) => {
        if (!b.el || !b.span) return
        if (t === null) {
          b.el.setAttribute('font-family', b.fonts[0])
          b.el.removeAttribute('text-anchor')
          b.span.setAttribute('x', b.x0)
          b.el.removeAttribute('transform')
          b.el.removeAttribute('opacity')
          b.current = -1
          return
        }
        const local = t - i * STAGGER
        const k = Math.max(0, Math.floor(local / STEP)) % b.fonts.length
        const u = local - Math.floor(local / STEP) * STEP // time inside this step
        if (k !== b.current) {
          b.current = k
          b.el.setAttribute('font-family', b.fonts[k])
          b.el.setAttribute('text-anchor', 'middle')
          b.span.setAttribute('x', String(b.cx))
        }
        // fade out sliding down just before the next swap, fade in from above right after it
        const out = clamp01((u - (STEP - OUT)) / OUT)
        const inn = local < 0 ? 1 : easeOutCubic(clamp01(u / IN))
        const o = Math.min(inn, 1 - out)
        const dy = out > 0 ? SLIDE * out : -SLIDE * (1 - inn)
        b.el.setAttribute('opacity', o.toFixed(3))
        b.el.setAttribute('transform', `translate(0 ${dy.toFixed(2)})`)
      }),
    { loop: LOOP },
  )
}
