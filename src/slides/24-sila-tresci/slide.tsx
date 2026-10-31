import { RiggedSlide } from '../RiggedSlide'
import type { SlideMeta, SlideProps } from '../types'
import { bloomRig } from './bloom'
import svg from './slide.svg?raw'

// Source: Figma frame 121:25120 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Siła treści",
  animations: [{ description: 'On the rich card the clouds drift slowly and the patterned flower keeps turning.', loop: true }],
}

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="sila-tresci" svg={svg} play={play} rig={bloomRig} />
}
