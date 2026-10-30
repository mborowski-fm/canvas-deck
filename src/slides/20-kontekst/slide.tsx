import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 115:3500 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Kontekst" }

export default function Slide() {
  return <SvgSlide id="kontekst" svg={svg} />
}
