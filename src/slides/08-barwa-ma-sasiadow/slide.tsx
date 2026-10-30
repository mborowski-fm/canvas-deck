import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 115:7710 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Barwa ma sąsiadów" }

export default function Slide() {
  return <SvgSlide id="barwa-ma-sasiadow" svg={svg} />
}
