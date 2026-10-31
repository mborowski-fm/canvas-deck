import { RiggedSlide } from '../RiggedSlide'
import type { SlideMeta, SlideProps } from '../types'
import { spotlightRig } from './spotlight'
import svg from './slide.svg?raw'

// Source: Figma frame 115:3500 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Kontekst",
  animations: [{ description: 'The element drifts left and right and the light follows it from one fixed point, so the beam leans into a trapezoid.', loop: true }],
}

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="kontekst" svg={svg} play={play} rig={spotlightRig} />
}
