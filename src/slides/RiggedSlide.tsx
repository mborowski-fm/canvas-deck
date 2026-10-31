import { useEffect, useRef } from 'react'
import type { Rig } from './motion'
import { SvgSlide } from './SvgSlide'
import type { SlideProps } from './types'

/**
 * A Figma SVG slide driven by a rig: rest pose when the slide is not active, and the
 * animation (re)started whenever `play.key` changes.
 */
export function RiggedSlide({ id, svg, play, rig }: SlideProps & { id: string; svg: string; rig: (root: HTMLElement, prefix: string) => Rig }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const r = rig(ref.current!, id)
    if (!play) return r.rest()
    return r.play()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play?.key, play?.anim])
  return (
    <div ref={ref} style={{ width: '100%', height: '100%' }}>
      <SvgSlide id={id} svg={svg} />
    </div>
  )
}
