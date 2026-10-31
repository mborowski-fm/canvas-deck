import { RiggedSlide } from '../RiggedSlide'
import type { SlideMeta, SlideProps } from '../types'
import { heartRig } from './heart'
import svg from './slide.svg?raw'

// Source: Figma frame 115:7452 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Puste miejsce",
  animations: [{ description: 'Four key frames: the walls touch the heart; the heart pushes the lime wall twice to the left (about 1/3) and the third strike knocks it out; it crosses over and does the same to the magenta wall (about 2/3), whose exit is a bit slower; it returns to the middle and beats. Only the heartbeat loops (Replay starts again from the walls).', loop: true }],
}

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="puste-miejsce" svg={svg} play={play} rig={heartRig} />
}
