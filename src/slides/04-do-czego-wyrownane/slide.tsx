import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 115:6627 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Do czego wyrównane?" }

export default function Slide() {
  return <SvgSlide id="do-czego-wyrownane" svg={svg} />
}
