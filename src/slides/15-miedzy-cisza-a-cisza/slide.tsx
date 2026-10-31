import { RiggedSlide } from '../RiggedSlide'
import type { SlideMeta, SlideProps } from '../types'
import { klikRig } from './klik'
import svg from './slide.svg?raw'

// Source: Figma frame 118:10149 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Między ciszą a ciszą",
  animations: [{ description: 'The right finger hammers the red button hard and nervously; every press leaves a KLIK label (max 12, the oldest fades out).', loop: true }],
}

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="miedzy-cisza-a-cisza" svg={svg} play={play} rig={klikRig} />
}
