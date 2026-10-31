import { RiggedSlide } from '../RiggedSlide'
import type { SlideMeta, SlideProps } from '../types'
import { fontsRig } from './fonts'
import svg from './slide.svg?raw'

// Source: Figma frame 118:7955 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Jest ważna",
  animations: [{ description: 'Each box keeps its vibe and shows five fonts of it (standard sans, serious serif, playful display), swapping with a calm crossfade, the boxes taking turns.', loop: true }],
}

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="jest-wazna" svg={svg} play={play} rig={fontsRig} />
}
