import { RiggedSlide } from '../RiggedSlide'
import { stringsRig } from '../strings'
import type { SlideMeta, SlideProps } from '../types'
import svg from './slide.svg?raw'

// Source: Figma frame 115:6370 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Optyka vs linijka",
  animations: [{ description: 'Interactive: the orange lines behave like guitar strings under the cursor (catch, bend, snap and ring).', loop: true }],
}

const rig = stringsRig(['Line 6', 'Line 5'])

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="optyka-vs-linijka" svg={svg} play={play} rig={rig} />
}
