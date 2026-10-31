import { RiggedSlide } from '../RiggedSlide'
import type { SlideMeta, SlideProps } from '../types'
import { hopRig } from './hop'
import svg from './slide.svg?raw'

// Source: Figma frame 120:22878 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Bohater?",
  animations: [{ description: 'A colorful dot hops onto a grey dot on the left; then a grey dot hops into the gap on the right; both hop home. Other dots every cycle.', loop: true }],
}

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="bohater" svg={svg} play={play} rig={hopRig} />
}
