import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Slide } from '../slides/types'
import type { Peer } from '../sync'
import type { Pos } from './align'

interface Cam { x: number; y: number; z: number }
const MIN_Z = 0.03
const MAX_Z = 4

export type ViewReq = { n: number; mode: 'all' | 'active' }

interface Props {
  slides: Slide[]
  active: number
  /** View mode: click. Edit mode: only double click. Shared with everyone. */
  onActive: (i: number) => void
  peers: Peer[]
  onCursor: (x?: number, y?: number) => void
  /** Bump n to re-fit the camera (all slides, or the active one). Local only. */
  view: ViewReq
  edit: boolean
  selected: string[]
  onSelected: (ids: string[]) => void
  onMove: (items: Pos[]) => void
  /** Called once when a drag actually starts moving, with the original positions (for undo). */
  onMoveStart: (orig: Pos[]) => void
}

type Drag =
  | { kind: 'pan'; lx: number; ly: number; moved: number; hit: number | null }
  | { kind: 'move'; sx: number; sy: number; orig: Pos[]; moved: number; hit: string; shift: boolean; wasSel: boolean; started?: boolean }
  | { kind: 'marquee'; sx: number; sy: number; base: string[] }

const hitOf = (t: EventTarget | null) => {
  const v = (t as HTMLElement | null)?.closest?.('[data-slide]')?.getAttribute('data-slide')
  return v == null ? null : Number(v)
}

export function Canvas({ slides, active, onActive, peers, onCursor, view, edit, selected, onSelected, onMove, onMoveStart }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [cam, setCam] = useState<Cam>({ x: 0, y: 0, z: 0.3 })
  const [animate, setAnimate] = useState(false)
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [space, setSpace] = useState(false)
  const drag = useRef<Drag | null>(null)
  const camRef = useRef(cam)
  const slidesRef = useRef(slides)
  const selRef = useRef(selected)
  camRef.current = cam
  slidesRef.current = slides
  selRef.current = selected

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
  // Depends on `active` only: moving slides in edit mode must not move the camera.
  useLayoutEffect(() => {
    const s = slidesRef.current[active]
    if (s) fit([s], 100)
  }, [active, fit])

  useEffect(() => {
    if (!view.n) return
    const all = slidesRef.current
    fit(view.mode === 'all' ? all : [all[active]].filter(Boolean), view.mode === 'all' ? 112 : 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.n, view.mode, fit])

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

  // hold Space to pan in edit mode
  useEffect(() => {
    const dn = (e: KeyboardEvent) =>
      e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) && setSpace(true)
    const up = (e: KeyboardEvent) => e.code === 'Space' && setSpace(false)
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', dn)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const local = (e: React.PointerEvent | React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const toWorld = (p: { x: number; y: number }) => ({
    x: (p.x - camRef.current.x) / camRef.current.z,
    y: (p.y - camRef.current.y) / camRef.current.z,
  })

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return
    setAnimate(false)
    const hit = hitOf(e.target)
    const p = local(e)
    if (e.button === 1 || space || !edit) {
      drag.current = { kind: 'pan', lx: e.clientX, ly: e.clientY, moved: 0, hit }
      return
    }
    if (hit != null) {
      const id = slidesRef.current[hit].id
      const wasSel = selRef.current.includes(id)
      let sel = selRef.current
      if (e.shiftKey) {
        sel = wasSel ? sel.filter((s) => s !== id) : [...sel, id]
        onSelected(sel)
        if (wasSel) return
      } else if (!wasSel) {
        sel = [id]
        onSelected(sel)
      }
      const orig = slidesRef.current.filter((s) => sel.includes(s.id)).map((s) => ({ id: s.id, x: s.x, y: s.y }))
      drag.current = { kind: 'move', sx: e.clientX, sy: e.clientY, orig, moved: 0, hit: id, shift: e.shiftKey, wasSel }
    } else {
      if (!e.shiftKey) onSelected([])
      drag.current = { kind: 'marquee', sx: p.x, sy: p.y, base: e.shiftKey ? selRef.current : [] }
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const p = local(e)
    const w = toWorld(p)
    onCursor(w.x, w.y)
    const d = drag.current
    if (!d) return
    if (!e.buttons) { drag.current = null; setBox(null); return }
    if (d.kind === 'pan') {
      const dx = e.clientX - d.lx
      const dy = e.clientY - d.ly
      d.moved += Math.abs(dx) + Math.abs(dy)
      d.lx = e.clientX
      d.ly = e.clientY
      setCam((c) => ({ ...c, x: c.x + dx, y: c.y + dy }))
    } else if (d.kind === 'move') {
      const dx = (e.clientX - d.sx) / camRef.current.z
      const dy = (e.clientY - d.sy) / camRef.current.z
      d.moved = Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy)
      if (d.moved >= 4 && !d.started) { d.started = true; onMoveStart(d.orig) }
      if (d.moved >= 4) onMove(d.orig.map((o) => ({ id: o.id, x: Math.round(o.x + dx), y: Math.round(o.y + dy) })))
    } else {
      const x = Math.min(d.sx, p.x), y = Math.min(d.sy, p.y)
      const bw = Math.abs(p.x - d.sx), bh = Math.abs(p.y - d.sy)
      setBox({ x, y, w: bw, h: bh })
      const a = toWorld({ x, y })
      const b = toWorld({ x: x + bw, y: y + bh })
      const hits = slidesRef.current
        .filter((s) => s.x < b.x && s.x + s.width > a.x && s.y < b.y && s.y + s.height > a.y)
        .map((s) => s.id)
      onSelected([...new Set([...d.base, ...hits])])
    }
  }

  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    setBox(null)
    if (!d) return
    if (d.kind === 'pan' && d.moved < 5 && d.hit != null && !edit) onActive(d.hit)
    // click without drag on one of several selected slides narrows the selection
    if (d.kind === 'move' && d.moved < 4 && !d.shift && d.wasSel && d.orig.length > 1) onSelected([d.hit])
  }

  // Double click = focus: fly to that slide and make it active for everyone.
  const onDoubleClick = (e: React.MouseEvent) => {
    const hit = hitOf(e.target)
    if (hit == null) return
    onActive(hit)
    fit([slidesRef.current[hit]], 100)
  }

  const z = cam.z
  return (
    <div
      ref={ref}
      className={'canvas' + (edit ? ' edit' : '') + (space ? ' space' : '')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      onPointerLeave={() => onCursor(undefined, undefined)}
    >
      <div
        className="world"
        style={{
          ['--px' as string]: `${1 / z}px`,
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${z})`,
          transition: animate ? 'transform 0.6s cubic-bezier(.2,.8,.2,1)' : 'none',
        }}
      >
        {slides.map((s) => {
          const sel = selected.includes(s.id)
          return (
            <div
              key={s.id}
              data-slide={s.index}
              className={'frame' + (sel ? ' selected' : '') + (s.index === active ? ' active' : '')}
              style={{ left: s.x, top: s.y, width: s.width, height: s.height }}
            >
              <div className="frame-label" style={{ transform: `scale(${1 / z})`, maxWidth: s.width * z }}>
                {s.title}
              </div>
              <div className="artboard">
                <s.Component />
              </div>
              {sel && edit && (
                <>
                  {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => (
                    <i key={`${a}${b}`} className="handle" style={{ left: `${a * 100}%`, top: `${b * 100}%` }} />
                  ))}
                </>
              )}
            </div>
          )
        })}
        {peers.map(
          (p) =>
            p.x != null &&
            p.y != null && (
              <div key={p.id} className="cursor" style={{ left: p.x, top: p.y }}>
                <div style={{ transform: `scale(${1 / z})`, transformOrigin: '0 0' }}>
                  <svg width="18" height="20" viewBox="0 0 18 20">
                    <path d="M1.5 1.5 L1.5 15.5 L5.3 12 L8.2 18.3 L10.6 17.2 L7.8 11 L13 11 Z" fill={p.color} strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                  <span style={{ background: p.color }}>{p.name}</span>
                </div>
              </div>
            ),
        )}
      </div>
      {box && <div className="marquee" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />}
    </div>
  )
}
