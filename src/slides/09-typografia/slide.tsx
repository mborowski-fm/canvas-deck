import { RiggedSlide } from '../RiggedSlide'
import type { SlideMeta, SlideProps } from '../types'
import { caretRig } from './caret'
import svg from './slide.svg?raw'

// Source: Figma frame 115:2683 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Typografia",
  animations: [{ description: 'A text caret blinks after the title, like an editor waiting for input.', loop: true }],
}

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="typografia" svg={svg} play={play} rig={caretRig} />
}
