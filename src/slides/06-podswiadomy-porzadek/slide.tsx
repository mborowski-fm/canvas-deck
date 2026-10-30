import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 115:7195 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Podświadomy porządek" }

export default function Slide() {
  return <SvgSlide id="podswiadomy-porzadek" svg={svg} />
}
