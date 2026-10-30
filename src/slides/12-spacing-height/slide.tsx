import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 118:8352 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Spacing, height itd." }

export default function Slide() {
  return <SvgSlide id="spacing-height" svg={svg} />
}
