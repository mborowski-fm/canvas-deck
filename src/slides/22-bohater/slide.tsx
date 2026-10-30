import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 120:22878 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Bohater?" }

export default function Slide() {
  return <SvgSlide id="bohater" svg={svg} />
}
