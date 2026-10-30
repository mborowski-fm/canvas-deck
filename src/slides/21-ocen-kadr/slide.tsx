import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 120:11283 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Oceń kadr" }

export default function Slide() {
  return <SvgSlide id="ocen-kadr" svg={svg} />
}
