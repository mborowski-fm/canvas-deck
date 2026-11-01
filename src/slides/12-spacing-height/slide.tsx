import { RiggedSlide } from '../RiggedSlide'
import type { SlideMeta, SlideProps } from '../types'
import { foxRig } from './fox'
import svg from './slide.svg?raw'

// Source: Figma frame 118:8352 (UI-Prezentacja storyboard). The fox is drawn by hand in
// slide.svg (Figma exports its pattern mask empty).
export const meta: SlideMeta = {
  title: "Spacing, height itd.",
  animations: [{ description: 'The fox jumps in onto the first text column, then onto the second, then out of the frame (rigid hops).', loop: true }],
}

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="spacing-height" svg={svg} play={play} rig={foxRig} />
}
