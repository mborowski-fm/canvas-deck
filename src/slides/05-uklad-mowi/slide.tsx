import { RiggedSlide } from '../RiggedSlide'
import type { SlideMeta, SlideProps } from '../types'
import { blocksRig } from './blocks'
import svg from './slide.svg?raw'

// Source: Figma frame 115:6761 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Układ mówi, zanim zrobi to tekst",
  animations: [
    { description: 'Loop: the colored blocks start centered inside their grey outlines, slide to the left edge one after another (the chevrons light up behind them), hold, and slide back to the center.', loop: true },
  ],
}

export default function Slide({ play }: SlideProps) {
  return <RiggedSlide id="uklad-mowi" svg={svg} play={play} rig={blocksRig} />
}
