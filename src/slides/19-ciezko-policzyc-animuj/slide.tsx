import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 118:10884 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Ciężko policzyć, animuj" }

export default function Slide() {
  return <SvgSlide id="ciezko-policzyc-animuj" svg={svg} />
}
