import { RiggedSlide } from '../RiggedSlide'
import type { SlideMeta, SlideProps } from '../types'
import { trailRig } from './trail'
import svg from './slide.svg?raw'

// Source: Figma frame 115:2813 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Ruch i reakcja",
  animations: [{ description: 'The patterned cursor travels left to right leaving the solid cursors behind it (they simply appear), then travels back and takes them back.', loop: true }],
}

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="ruch-i-reakcja" svg={svg} play={play} rig={trailRig} />
}
