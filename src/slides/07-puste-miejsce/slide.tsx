import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 115:7452 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Puste miejsce" }

export default function Slide() {
  return <SvgSlide id="puste-miejsce" svg={svg} />
}
