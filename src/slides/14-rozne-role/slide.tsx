import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 118:10030 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Różne role" }

export default function Slide() {
  return <SvgSlide id="rozne-role" svg={svg} />
}
