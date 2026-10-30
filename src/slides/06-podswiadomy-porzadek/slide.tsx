import { useEffect, useRef } from 'react'
import { SvgSlide } from '../SvgSlide'
import type { SlideMeta, SlideProps } from '../types'
import { bricksRig } from './bricks'
import svg from './slide.svg?raw'

// Source: Figma frame 115:7195 (UI-Prezentacja storyboard)
export const meta: SlideMeta = {
  title: "Podświadomy porządek",
  animations: [
    { description: 'Loop: the wall starts neat; from the bottom up each colored brick is knocked out and pushes the one above (the orange one ends up shoved up), the bricks hold still for a moment, then slide back into the wall and it starts again. Motion is stiff and heavy, like real bricks.', loop: true },
  ],
}

export default function Slide({ play }: SlideProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const rig = bricksRig(ref.current!, 'podswiadomy-porzadek')
    if (!play) return rig.rest()
    return rig.play()
  }, [play?.key])
  return (
    <div ref={ref} style={{ width: '100%', height: '100%' }}>
      <SvgSlide id="podswiadomy-porzadek" svg={svg} />
    </div>
  )
}
