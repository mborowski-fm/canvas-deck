import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 120:24581 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Treść się zmieni" }

export default function Slide() {
  return <SvgSlide id="tresc-sie-zmieni" svg={svg} />
}
