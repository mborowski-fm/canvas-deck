import { RiggedSlide } from '../RiggedSlide'
import { stringsRig } from '../strings'
import type { SlideMeta, SlideProps } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 115:6627 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Do czego wyrównane?",
  animations: [{ description: 'Interactive: the orange lines behave like guitar strings under the cursor (catch, bend, snap and ring).', loop: true }],
}

const rig = stringsRig(['Line_7', 'Line_8', 'Line_9'])

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="do-czego-wyrownane" svg={svg} play={play} rig={rig} />
}
