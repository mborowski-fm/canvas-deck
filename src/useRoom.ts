import { useCallback, useEffect, useRef, useState } from 'react'
import { createSync, type LayoutItem, type Me, type Peer, type Sync, type ViewMsg } from './sync'

/** Merge incoming per-slide items, last write wins. Returns null when nothing changed. */
function mergeLww<T extends { id: string; ts: number }>(cur: Record<string, T>, items: T[]) {
  let next: Record<string, T> | null = null
  for (const it of items) {
    if (!cur[it.id] || it.ts > cur[it.id].ts) (next ??= { ...cur })[it.id] = it
  }
  return next
}

/** Last (re)played animation on this presenter's screen. */
export type PlayState = { slide: string; anim: number; ts: number }

/**
 * Everything multiplayer. Presenters do not get in each other's way: the active slide and
 * animations are local to each presenter. Shared: cursors/presence, slide positions from edit
 * mode, and every presenter's view (camera + active slide + animation) so others can follow it.
 */
export function useRoom(roomId: string, me: Me, slideCount: number) {
  const [active, setActiveState] = useState({ index: 0, ts: 0 })
  const [play, setPlay] = useState<PlayState | null>(null)
  const [peers, setPeers] = useState<Record<string, Peer>>({})
  const [layout, setLayout] = useState<Record<string, LayoutItem>>({})
  const layoutRef = useRef(layout)
  const [views, setViews] = useState<Record<string, ViewMsg>>({})
  const myView = useRef<ViewMsg | null>(null)
  const lastTs = useRef(0)
  const sync = useRef<Sync | null>(null)
  const meRef = useRef(me)
  const lastPos = useRef<{ x?: number; y?: number }>({})
  meRef.current = me

  const announce = useCallback(() => {
    sync.current?.sendCursor({ ...meRef.current, ...lastPos.current })
  }, [])

  useEffect(() => {
    const s = createSync(roomId)
    sync.current = s
    s.onLayout((items) => {
      const next = mergeLww(layoutRef.current, items)
      if (next) setLayout((layoutRef.current = next))
    })
    s.onView((v, from) => setViews((all) => ({ ...all, [from]: v })))
    s.onCursor((c, from) =>
      setPeers((p) => ({ ...p, [from]: { ...c, id: from, seen: Date.now() } })),
    )
    s.onPeersChange((ids) =>
      setPeers((p) => Object.fromEntries(Object.entries(p).filter(([id]) => ids.includes(id)))),
    )
    s.onPeerJoin((id) => {
      const all = Object.values(layoutRef.current)
      if (all.length) s.sendLayout(all, id)
      if (myView.current) s.sendView({ ...myView.current, fly: false }, id)
      announce()
    })
    const beat = setInterval(announce, 4000)
    return () => {
      clearInterval(beat)
      s.leave()
      sync.current = null
    }
  }, [roomId, announce])

  // tell others when our name/color changes
  useEffect(announce, [me.name, me.color, announce])

  /** Change this presenter's active slide (local; followers see it through the view). */
  const setActive = useCallback(
    (i: number) => setActiveState({ index: Math.max(0, Math.min(slideCount - 1, i)), ts: Date.now() }),
    [slideCount],
  )

  /** Move slides (edit mode). Shared with everyone, last write wins per slide. */
  const moveSlides = useCallback((items: { id: string; x: number; y: number }[]) => {
    const ts = (lastTs.current = Math.max(Date.now(), lastTs.current + 1))
    const stamped = items.map((i) => ({ ...i, ts }))
    const next = { ...layoutRef.current }
    for (const it of stamped) next[it.id] = it
    layoutRef.current = next
    setLayout(next)
    sync.current?.sendLayout(stamped)
  }, [])

  /** Broadcast this presenter's view (camera, active slide, animation), so others can follow it. */
  const sendView = useCallback((v: ViewMsg) => {
    myView.current = v
    sync.current?.sendView(v)
  }, [])

  /** (Re)play an animation of a slide (local). */
  const playAnim = useCallback((slide: string, anim: number) => setPlay({ slide, anim, ts: Date.now() }), [])

  const sendCursor = useCallback((x?: number, y?: number) => {
    lastPos.current = { x, y }
    announce()
  }, [announce])

  return { active: active.index, activeTs: active.ts, play, playAnim, setActive, peers: Object.values(peers), sendCursor, layout, moveSlides, views, sendView }
}
