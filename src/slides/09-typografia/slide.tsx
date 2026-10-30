import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 115:2683 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Typografia" }

export default function Slide() {
  return <SvgSlide id="typografia" svg={svg} />
}
