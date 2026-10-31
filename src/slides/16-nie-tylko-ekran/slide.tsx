import { RiggedSlide } from '../RiggedSlide'
import type { SlideMeta, SlideProps } from '../types'
import { buzzRig } from './buzz'
import svg from './slide.svg?raw'

// Source: Figma frame 118:10420 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Nie tylko ekran",
  animations: [{ description: 'The finger taps up into the round button; on every press the zigzag lines buzz like haptic feedback.', loop: true }],
}

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="nie-tylko-ekran" svg={svg} play={play} rig={buzzRig} />
}
