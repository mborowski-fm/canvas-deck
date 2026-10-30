import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 118:10660 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Znaj umiar" }

export default function Slide() {
  return <SvgSlide id="znaj-umiar" svg={svg} />
}
