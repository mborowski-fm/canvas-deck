import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 115:2813 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Ruch i reakcja" }

export default function Slide() {
  return <SvgSlide id="ruch-i-reakcja" svg={svg} />
}
