import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 118:10566 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Emocje, ton, tempo" }

export default function Slide() {
  return <SvgSlide id="emocje-ton-tempo" svg={svg} />
}
