import { RiggedSlide } from '../RiggedSlide'
import type { SlideMeta, SlideProps } from '../types'
import { podiumRig } from './podium'
import svg from './slide.svg?raw'

// Source: Figma frame 118:10884 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Ciężko policzyć, animuj",
  animations: [{ description: 'The flasks stand on the ground at the bottom; the podium blocks rise slowly one by one (third, second, then the winner) and lift them; the flasks rock when picked up and when the blocks stop.' }],
}

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="ciezko-policzyc-animuj" svg={svg} play={play} rig={podiumRig} />
}
