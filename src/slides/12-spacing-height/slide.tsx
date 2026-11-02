import { RiggedSlide } from '../RiggedSlide'
import type { SlideMeta, SlideProps } from '../types'
import { leadingRig } from './leading'
import svg from './slide.svg?raw'

// Source: Figma frame 118:8352 (UI-Prezentacja storyboard), live text (Figtree 500, 64 px, 150%).
export const meta: SlideMeta = {
  title: "Spacing, height itd.",
  animations: [{ description: 'Line height matters: the paragraph starts cramped (100%), opens up to 150% with a soft spring, rests, then closes again.', loop: true }],
}

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="spacing-height" svg={svg} play={play} rig={leadingRig} />
}
