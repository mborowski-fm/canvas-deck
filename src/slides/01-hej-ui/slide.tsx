import { RiggedSlide } from '../RiggedSlide'
import type { SlideMeta, SlideProps } from '../types'
import { smileRig } from './smile'
import svg from './slide.svg?raw'

// Source: Figma frame 104:1059 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Hej UI!",
  animations: [{ description: 'Now and then the smiling face in the middle hops for joy (single hop, pause, double hop), as if answering "Dobry?".', loop: true }],
}

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="hej-ui" svg={svg} play={play} rig={smileRig} />
}
