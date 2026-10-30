import { useEffect, useRef } from 'react'
import { SvgSlide } from '../SvgSlide'
import type { SlideMeta, SlideProps } from '../types'
import { eyeRig } from './eye'
import svg from './slide.svg?raw'

// Source: Figma frame 115:2207 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Percepcja",
  animations: [
    { description: 'The eye looks left and right and blinks now and then; the lids slide over the eye.', loop: true },
  ],
}

export default function Slide({ play }: SlideProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const rig = eyeRig(ref.current!, 'percepcja')
    if (!play) return rig.rest()
    return rig.play()
  }, [play?.key])
  return (
    <div ref={ref} style={{ width: '100%', height: '100%' }}>
      <SvgSlide id="percepcja" svg={svg} />
    </div>
  )
}
