import { RiggedSlide } from '../RiggedSlide'
import type { SlideMeta, SlideProps } from '../types'
import { ballsRig } from './balls'
import svg from './slide.svg?raw'

// Source: Figma frame 118:10566 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Emocje, ton, tempo",
  animations: [{ description: 'Two balls drop on the dashed floor. Pink is bouncy (stretch and squash, several bounces); black is calm and heavy (no squash, a thud that knocks the floor). Then both glide back up and drop again.', loop: true }],
}

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="emocje-ton-tempo" svg={svg} play={play} rig={ballsRig} />
}
