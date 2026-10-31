import { RiggedSlide } from '../RiggedSlide'
import type { SlideMeta, SlideProps } from '../types'
import { carouselRig } from './carousel'
import svg from './slide.svg?raw'

// Source: Figma frame 104:1059 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Hej UI!",
  animations: [{ description: 'A carousel of moods: every 2 s the faces slide one place left, a new face comes in on the right, and the face landing in the middle hops as if answering "Dobry?".', loop: true }],
}

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="hej-ui" svg={svg} play={play} rig={carouselRig} />
}
