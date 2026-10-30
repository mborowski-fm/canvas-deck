import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 115:2207 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Percepcja" }

export default function Slide() {
  return <SvgSlide id="percepcja" svg={svg} />
}
