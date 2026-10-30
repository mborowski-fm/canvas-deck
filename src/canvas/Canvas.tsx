import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Slide } from '../slides/types'
import type { Peer } from '../sync'

interface Cam { x: number; y: number; z: number }
const MIN_Z = 0.05
const MAX_Z = 4

interface Props {
  slides: Slide[]
  active: number
  onSelect: (i: number) => void
  peers: Peer[]
  onCursor: (x?: number, y?: number) => void
  /** Bump to re-fit all slides (overview). */
  overviewSignal: number
}

export function Canvas({ slides, active, onSelect, peers, onCursor, overviewSignal }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [cam, setCam] = useState<Cam>({ x: 0, y: 0, z: 0.3 })
  const [animate, setAnimate] = useState(false)
  const camRef = useRef(cam)
  camRef.current = cam
  const drag = useRef<{ x: number; y: number; moved: number } | null>(null)

  const fit = useCallback((items: Slide[], pad: number) => {
    const el = ref.current
    if (!el || !items.length) return
    const x0 = Math.min(...items.map((s) => s.x))
    const y0 = Math.min(...items.map((s) => s.y))
    const x1 = Math.max(...items.map((s) => s.x + s.width))
    const y1 = Math.max(...items.map((s) => s.y + s.height))
    const { width: vw, height: vh } = el.getBoundingClientRect()
    const z = Math.min((vw - pad * 2) / (x1 - x0), (vh - pad * 2) / (y1 - y0), MAX_Z)
    setAnimate(true)
    setCam({ z, x: vw / 2 - ((x0 + x1) / 2) * z, y: vh / 2 - ((y0 + y1) / 2) * z })
  }, [])

  // Everyone flies to the active slide when it changes (it is shared state).
  useLayoutEffect(() => {
    if (slides[active]) fit([slides[active]], 80)
  }, [active, slides, fit])

  useEffect(() => {
    if (overviewSignal) fit(slides, 60)
  }, [overviewSignal, slides, fit])

  // wheel: pan, ctrl/pinch: zoom around pointer. Needs a non-passive listener.
  useEffect(() => {
    const el = ref.current!
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setAnimate(false)
      const c = camRef.current
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect()
        const px = e.clientX - r.left
        const py = e.clientY - r.top
        const z = Math.min(MAX_Z, Math.max(MIN_Z, c.z * Math.exp(-e.deltaY * 0.01)))
        const k = z / c.z
        setCam({ z, x: px - (px - c.x) * k, y: py - (py - c.y) * k })
      } else {
        setCam({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const toWorld = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    const c = camRef.current
    return { x: (e.clientX - r.left - c.x) / c.z, y: (e.clientY - r.top - c.y) / c.z }
  }

  return (
    <div
      ref={ref}
      className="canvas"
      style={{ backgroundPosition: `${cam.x}px ${cam.y}px`, backgroundSize: `${40 * cam.z}px ${40 * cam.z}px` }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY, moved: 0 }
        setAnimate(false)
      }}
      onPointerMove={(e) => {
        const w = toWorld(e)
        onCursor(w.x, w.y)
        const d = drag.current
        if (d && e.buttons) {
          const dx = e.clientX - d.x
          const dy = e.clientY - d.y
          d.moved += Math.abs(dx) + Math.abs(dy)
          d.x = e.clientX
          d.y = e.clientY
          setCam((c) => ({ ...c, x: c.x + dx, y: c.y + dy }))
        }
      }}
      onPointerUp={(e) => {
        const d = drag.current
        drag.current = null
        if (d && d.moved < 5) {
          const idx = (e.target as HTMLElement).closest('[data-slide]')?.getAttribute('data-slide')
          if (idx != null) onSelect(Number(idx))
        }
      }}
      onPointerLeave={() => onCursor(undefined, undefined)}
    >
      <div
        className="world"
        style={{
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`,
          transition: animate ? 'transform 0.6s cubic-bezier(.2,.8,.2,1)' : 'none',
        }}
      >
        {slides.map((s) => (
          <div key={s.id} style={{ position: 'absolute', left: s.x, top: s.y }}>
            <div className="slide-label" style={{ fontSize: 28 }}>
              {String(s.index + 1).padStart(2, '0')} {s.title}
            </div>
            <div
              data-slide={s.index}
              className={'artboard' + (s.index === active ? ' active' : '')}
              style={{ width: s.width, height: s.height }}
            >
              <s.Component />
            </div>
          </div>
        ))}
        {peers.map(
          (p) =>
            p.x != null &&
            p.y != null && (
              <div key={p.id} className="cursor" style={{ left: p.x, top: p.y }}>
                <div style={{ transform: `scale(${1 / cam.z})`, transformOrigin: '0 0' }}>
                  <svg width="22" height="22" viewBox="0 0 22 22">
                    <path d="M2 2 L2 18 L7 13 L11 20 L14 18.5 L10 12 L17 12 Z" fill={p.color} stroke="#fff" strokeWidth="1.5" />
                  </svg>
                  <span style={{ background: p.color }}>{p.name}</span>
                </div>
              </div>
            ),
        )}
      </div>
    </div>
  )
}
