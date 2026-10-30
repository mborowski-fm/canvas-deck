import { SvgSlide } from '../SvgSlide'
import type { SlideMeta } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 118:10149 (UI-Prezentacja storyboard)
export const meta: SlideMeta = { title: "Między ciszą a ciszą" }

export default function Slide() {
  return <SvgSlide id="miedzy-cisza-a-cisza" svg={svg} />
}
