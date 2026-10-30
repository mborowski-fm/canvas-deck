import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '../Icon'
import { embedUrl, itemLabel, type CanvasItem } from '../items'
import type { Slide, SlideProps } from '../slides/types'
import type { Peer, ViewMsg } from '../sync'
import type { Box, Pos } from './align'

interface Cam { x: number; y: number; z: number }
const MIN_Z = 0.03
const MAX_Z = 4
const MIN_ITEM = 80 // px, smallest element size when resizing

export type ViewReq = { n: number; mode: 'all' | 'active' }
/** the camera part of a ViewMsg */
export type CamView = Pick<ViewMsg, 'cx' | 'cy' | 'w' | 'h' | 'fly'>

interface Props {
  slides: Slide[]
  /** free elements (images, videos, web pages); not part of the slide order */
  items: CanvasItem[]
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
  /** Called once when a drag or resize actually starts, with the ids it changes (for undo). */
  onChangeStart: (ids: string[]) => void
  onResize: (id: string, width: number, height: number) => void
  /** files or links dropped on the canvas in edit mode, at a world position */
  onDrop: (data: DataTransfer, at: { x: number; y: number }) => void
  /** lets the parent ask for the world point at the center of the view (to place new elements) */
  centerRef: React.MutableRefObject<() => { x: number; y: number }>
  /** animation playing on the active slide (other slides get null = rest pose) */
  play: SlideProps['play']
  /** 1, 2, 3 buttons on slides with several animations */
  onPlay: (anim: number) => void
  /** this presenter's camera changed (throttled), for others to follow */
  onView: (v: CamView) => void
  /** follow mode: the camera of the presenter being followed (null = free camera) */
  follow: ViewMsg | null
  /** the user moved the camera themselves (stops following) */
  onUserMove: () => void
}

type Hit = { type: 'slide'; index: number; id: string } | { type: 'item'; id: string }

type Drag =
  | { kind: 'pan'; lx: number; ly: number; moved: number; hit: Hit | null }
  | { kind: 'move'; sx: number; sy: number; orig: Pos[]; moved: number; hit: string; shift: boolean; wasSel: boolean; started?: boolean }
  | { kind: 'resize'; sx: number; sy: number; id: string; w: number; h: number; ratio: number | null; started?: boolean }
  | { kind: 'marquee'; sx: number; sy: number; base: string[] }

export function Canvas({ slides, items, active, onActive, peers, onCursor, view, edit, selected, onSelected, onMove, onChangeStart, onResize, onDrop, centerRef, play, onPlay, onView, follow, onUserMove }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [cam, setCam] = useState<Cam>({ x: 0, y: 0, z: 0.3 })
  const [animate, setAnimate] = useState(false)
  const [following, setFollowing] = useState(false) // short linear transition while tracking a leader
  const followRef = useRef(follow)
  followRef.current = follow
  const userMoveRef = useRef(onUserMove)
  userMoveRef.current = onUserMove
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [space, setSpace] = useState(false)
  // A live web page is a whole website running inside the canvas and makes panning stutter,
  // so pages show as light cards and at most one is live, on demand.
  const [live, setLive] = useState<string | null>(null)
  const drag = useRef<Drag | null>(null)
  const camRef = useRef(cam)
  const slidesRef = useRef(slides)
  const boxesRef = useRef<Box[]>([])
  const selRef = useRef(selected)
  camRef.current = cam
  slidesRef.current = slides
  boxesRef.current = [...slides, ...items]
  selRef.current = selected

  const hitOf = (t: EventTarget | null): Hit | null => {
    const el = (t as HTMLElement | null)?.closest?.('[data-slide],[data-item]')
    if (!el) return null
    const s = el.getAttribute('data-slide')
    if (s != null) return { type: 'slide', index: Number(s), id: slidesRef.current[Number(s)].id }
    return { type: 'item', id: el.getAttribute('data-item')! }
  }

  const fit = useCallback((targets: Box[], pad: number) => {
    const el = ref.current
    if (!el || !targets.length) return
    const x0 = Math.min(...targets.map((s) => s.x))
    const y0 = Math.min(...targets.map((s) => s.y))
    const x1 = Math.max(...targets.map((s) => s.x + s.width))
    const y1 = Math.max(...targets.map((s) => s.y + s.height))
    const { width: vw, height: vh } = el.getBoundingClientRect()
    const z = Math.min((vw - pad * 2) / (x1 - x0), (vh - pad * 2) / (y1 - y0), MAX_Z)
    setAnimate(true)
    setCam({ z, x: vw / 2 - ((x0 + x1) / 2) * z, y: vh / 2 - ((y0 + y1) / 2) * z })
  }, [])

  // Everyone flies to the active slide when it changes (it is shared state).
  // Depends on `active` only: moving slides in edit mode must not move the camera.
  useLayoutEffect(() => {
    const s = slidesRef.current[active]
    if (s && !followRef.current) fit([s], 100) // when following, the leader's camera decides
    setLive(null)
  }, [active, fit])

  // Follow mode: show the leader's world rect, fitted to this viewport.
  useEffect(() => {
    const el = ref.current
    if (!follow || !el) return setFollowing(false)
    const { width: vw, height: vh } = el.getBoundingClientRect()
    const z = Math.min(vw / follow.w, vh / follow.h, MAX_Z)
    setAnimate(follow.fly)
    setFollowing(!follow.fly)
    setCam({ z, x: vw / 2 - follow.cx * z, y: vh / 2 - follow.cy * z })
  }, [follow])

  // Share this camera (throttled) so others can follow it.
  const viewTimer = useRef(0)
  const animRef = useRef(animate)
  animRef.current = animate
  useEffect(() => {
    if (viewTimer.current) return
    viewTimer.current = window.setTimeout(() => {
      viewTimer.current = 0
      const el = ref.current
      if (!el) return
      const { width: vw, height: vh } = el.getBoundingClientRect()
      const c = camRef.current
      onView({ cx: (vw / 2 - c.x) / c.z, cy: (vh / 2 - c.y) / c.z, w: vw / c.z, h: vh / c.z, fly: animRef.current })
    }, 60)
  }, [cam, onView])

  useEffect(() => {
    if (!live) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setLive(null)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [live])

  useEffect(() => {
    if (!view.n) return
    const all = slidesRef.current
    fit(view.mode === 'all' ? all : [all[active]].filter(Boolean), view.mode === 'all' ? 112 : 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.n, view.mode, fit])

  centerRef.current = () => {
    const r = ref.current!.getBoundingClientRect()
    const c = camRef.current
    return { x: (r.width / 2 - c.x) / c.z, y: (r.height / 2 - c.y) / c.z }
  }

  // wheel: pan, ctrl/pinch: zoom around pointer. Needs a non-passive listener.
  useEffect(() => {
    const el = ref.current!
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setAnimate(false)
      userMoveRef.current()
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

  const local = (e: { clientX: number; clientY: number }) => {
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
    const target = e.target as HTMLElement
    const resizeId = edit ? target.closest?.('[data-resize]')?.getAttribute('data-resize') : null
    if (resizeId) {
      const it = items.find((i) => i.id === resizeId)
      if (it) {
        // media keep their aspect ratio; web pages resize freely
        const ratio = it.kind === 'image' || it.kind === 'video' || it.kind === 'embed' ? it.width / it.height : null
        drag.current = { kind: 'resize', sx: e.clientX, sy: e.clientY, id: it.id, w: it.width, h: it.height, ratio }
        return
      }
    }
    const hit = hitOf(target)
    if (!hit && live) setLive(null) // clicking the background closes a live page
    const p = local(e)
    if (e.button === 1 || space || !edit) {
      drag.current = { kind: 'pan', lx: e.clientX, ly: e.clientY, moved: 0, hit }
      return
    }
    if (hit) {
      const id = hit.id
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
      const orig = boxesRef.current.filter((s) => sel.includes(s.id)).map((s) => ({ id: s.id, x: s.x, y: s.y }))
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
      if (d.moved > 4) userMoveRef.current()
      setCam((c) => ({ ...c, x: c.x + dx, y: c.y + dy }))
    } else if (d.kind === 'move') {
      const dx = (e.clientX - d.sx) / camRef.current.z
      const dy = (e.clientY - d.sy) / camRef.current.z
      d.moved = Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy)
      if (d.moved >= 4 && !d.started) { d.started = true; onChangeStart(d.orig.map((o) => o.id)) }
      if (d.moved >= 4) onMove(d.orig.map((o) => ({ id: o.id, x: Math.round(o.x + dx), y: Math.round(o.y + dy) })))
    } else if (d.kind === 'resize') {
      if (!d.started) { d.started = true; onChangeStart([d.id]) }
      const width = Math.max(MIN_ITEM, Math.round(d.w + (e.clientX - d.sx) / camRef.current.z))
      const height = d.ratio ? Math.round(width / d.ratio) : Math.max(MIN_ITEM, Math.round(d.h + (e.clientY - d.sy) / camRef.current.z))
      onResize(d.id, width, height)
    } else {
      const x = Math.min(d.sx, p.x), y = Math.min(d.sy, p.y)
      const bw = Math.abs(p.x - d.sx), bh = Math.abs(p.y - d.sy)
      setBox({ x, y, w: bw, h: bh })
      const a = toWorld({ x, y })
      const b = toWorld({ x: x + bw, y: y + bh })
      const hits = boxesRef.current
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
    if (d.kind === 'pan' && d.moved < 5 && d.hit?.type === 'slide' && !edit) onActive(d.hit.index)
    // click without drag on one of several selected objects narrows the selection
    if (d.kind === 'move' && d.moved < 4 && !d.shift && d.wasSel && d.orig.length > 1) onSelected([d.hit])
  }

  // Double click = focus: a slide becomes active for everyone; an element is only zoomed to locally.
  const onDoubleClick = (e: React.MouseEvent) => {
    const hit = hitOf(e.target)
    if (!hit) return
    if (hit.type === 'slide') {
      onActive(hit.index)
      fit([slidesRef.current[hit.index]], 100)
    } else {
      const it = items.find((i) => i.id === hit.id)
      if (it) fit([it], 100)
    }
  }

  const z = cam.z
  return (
    <div
      ref={ref}
      className={'canvas' + (edit ? ' edit' : '') + (space ? ' space' : '')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={(e) => { userMoveRef.current(); onDoubleClick(e) }}
      onPointerLeave={() => onCursor(undefined, undefined)}
      onDragOver={(e) => edit && e.preventDefault()}
      onDrop={(e) => {
        if (!edit) return
        e.preventDefault()
        onDrop(e.dataTransfer, toWorld(local(e)))
      }}
    >
      <div
        className="world"
        style={{
          ['--px' as string]: `${1 / z}px`,
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${z})`,
          transition: animate ? 'transform 0.6s cubic-bezier(.2,.8,.2,1)' : following ? 'transform 0.12s linear' : 'none',
        }}
        // After a fly-to the browser keeps the slides rasterized at an in-between scale (blurry).
        // A tiny non-animated scale change makes it re-raster sharp at the final zoom.
        onTransitionEnd={(e) => {
          if (e.target !== e.currentTarget) return
          setAnimate(false)
          setCam((c) => ({ ...c, z: c.z * 1.0001 }))
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
                <s.Component play={s.index === active ? play : null} />
              </div>
              {s.index === active && s.animations.length > 1 && (
                <div className="anim-buttons" style={{ transform: `scale(${1 / z})` }} onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                  {s.animations.map((a, i) => (
                    <button key={i} className={play?.anim === i ? 'on' : ''} title={a.description} onClick={() => onPlay(i)}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
              {sel && edit && <Handles />}
            </div>
          )
        })}
        {items.map((it) => {
          const sel = selected.includes(it.id)
          return (
            <div
              key={it.id}
              data-item={it.id}
              className={'frame item' + (sel ? ' selected' : '')}
              style={{ left: it.x, top: it.y, width: it.width, height: it.height }}
            >
              <div className="frame-label" style={{ transform: `scale(${1 / z})`, maxWidth: it.width * z }}>
                <a href={it.src} target="_blank" rel="noreferrer" onPointerDown={(e) => e.stopPropagation()}>
                  {itemLabel(it)}
                </a>
              </div>
              {/* in view mode videos and pages take their own clicks (controls, scrolling) */}
              <div className="artboard" onPointerDown={(e) => !edit && it.kind !== 'image' && e.stopPropagation()}>
                <ItemView item={it} live={live === it.id} onLive={(on) => setLive(on ? it.id : null)} />
              </div>
              {sel && edit && <Handles />}
              {sel && edit && selected.length === 1 && (
                <i className="resize" data-resize={it.id} style={{ width: `calc(var(--px) * 18)`, height: `calc(var(--px) * 18)` }} title="Resize" />
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

function Handles() {
  return (
    <>
      {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => (
        <i key={`${a}${b}`} className="handle" style={{ left: `${a * 100}%`, top: `${b * 100}%` }} />
      ))}
    </>
  )
}

function ItemView({ item, live, onLive }: { item: CanvasItem; live: boolean; onLive: (on: boolean) => void }) {
  if (item.kind === 'image') return <img src={item.src} alt="" draggable={false} />
  if (item.kind === 'video') return <video src={item.src} controls playsInline loop preload="metadata" />
  if (item.kind === 'embed')
    return <iframe src={embedUrl(item.src) ?? item.src} title={item.src} loading="lazy" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen />
  if (!live)
    return (
      <div className="web-card">
        <b>{itemLabel(item)}</b>
        <small>{item.src}</small>
        <button className="cta" onPointerDown={(e) => e.stopPropagation()} onClick={() => onLive(true)}>
          <Icon name="play_arrow" />
          Show live page
        </button>
      </div>
    )
  // Some sites refuse to be embedded and show an empty frame; the label above links to them.
  return (
    <>
      <iframe src={item.src} title={item.src} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerPolicy="no-referrer" />
      <button className="web-close" title="Close live page (Esc)" onPointerDown={(e) => e.stopPropagation()} onClick={() => onLive(false)}>
        <Icon name="close" />
      </button>
    </>
  )
}
