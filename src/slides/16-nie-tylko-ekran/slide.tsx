import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 118:10420 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Nie tylko ekran" }

export default function Slide() {
  return <SvgSlide id="nie-tylko-ekran" svg={svg} />
}
