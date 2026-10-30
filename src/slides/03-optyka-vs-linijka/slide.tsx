import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 115:6370 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Optyka vs linijka" }

export default function Slide() {
  return <SvgSlide id="optyka-vs-linijka" svg={svg} />
}
