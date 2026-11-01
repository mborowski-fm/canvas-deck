import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 118:8240 (UI-Prezentacja storyboard). Text as curves on purpose: the letters use
// different glyph variants that live text would lose.
export const meta: SlideMeta = { title: "Tacy sami, a jednak ..." }

export default function Slide() {
  return <SvgSlide id="tacy-sami" svg={svg} />
}
