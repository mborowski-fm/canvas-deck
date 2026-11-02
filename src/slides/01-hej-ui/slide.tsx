import { RiggedSlide } from '../RiggedSlide'
import type { SlideMeta, SlideProps } from '../types'
import { lookRig } from './look'
import svg from './slide.svg?raw'

// Source: Figma frame 104:1059 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Hej UI!",
  animations: [{ description: 'The faces stay in place; their eyes and mouths follow your cursor, and when the cursor rests they look around at each other (eye-like saccades).', loop: true }],
}

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="hej-ui" svg={svg} play={play} rig={lookRig} />
}
