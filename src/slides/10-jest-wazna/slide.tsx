import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 118:7955 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Jest ważna" }

export default function Slide() {
  return <SvgSlide id="jest-wazna" svg={svg} />
}
