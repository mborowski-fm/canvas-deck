import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 115:6761 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Układ mówi, zanim zrobi to tekst" }

export default function Slide() {
  return <SvgSlide id="uklad-mowi" svg={svg} />
}
