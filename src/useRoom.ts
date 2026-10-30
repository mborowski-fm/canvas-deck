import { useCallback, useEffect, useRef, useState } from 'react'
import { createSync, type LayoutItem, type Me, type Peer, type PlayState, type SharedState, type Sync, type ViewMsg } from './sync'

const newer = (a: SharedState, b: SharedState) =>
  a.ts > b.ts || (a.ts === b.ts && a.by > b.by)

/** Merge incoming per-slide items, last write wins. Returns null when nothing changed. */
function mergeLww<T extends { id: string; ts: number }>(cur: Record<string, T>, items: T[]) {
  let next: Record<string, T> | null = null
  for (const it of items) {
    if (!cur[it.id] || it.ts > cur[it.id].ts) (next ??= { ...cur })[it.id] = it
  }
  return next
}

/**
 * Everything multiplayer: the shared active slide + live peers/cursors.
 * Any presenter can change `active`; it is last-write-wins for everyone.
 */
export function useRoom(roomId: string, me: Me, slideCount: number) {
  const [shared, setShared] = useState<SharedState>({ active: 0, ts: 0, by: '' })
  const [peers, setPeers] = useState<Record<string, Peer>>({})
  const [layout, setLayout] = useState<Record<string, LayoutItem>>({})
  const layoutRef = useRef(layout)
  const [play, setPlay] = useState<PlayState | null>(null)
  const [views, setViews] = useState<Record<string, ViewMsg>>({})
  const myView = useRef<ViewMsg | null>(null)
  const playRef = useRef(play)
  const lastTs = useRef(0)
  const sync = useRef<Sync | null>(null)
  const sharedRef = useRef(shared)
  const meRef = useRef(me)
  const lastPos = useRef<{ x?: number; y?: number }>({})
  meRef.current = me
  sharedRef.current = shared

  const announce = useCallback(() => {
    sync.current?.sendCursor({ ...meRef.current, ...lastPos.current })
  }, [])

  useEffect(() => {
    const s = createSync(roomId)
    sync.current = s
    s.onState((st) => {
      if (newer(st, sharedRef.current)) setShared(st)
    })
    s.onLayout((items) => {
      const next = mergeLww(layoutRef.current, items)
      if (next) setLayout((layoutRef.current = next))
    })
    s.onView((v, from) => setViews((all) => ({ ...all, [from]: v })))
    s.onPlay((p) => {
      const cur = playRef.current
      if (!cur || p.ts > cur.ts || (p.ts === cur.ts && p.by > cur.by)) setPlay((playRef.current = p))
    })
    s.onCursor((c, from) =>
      setPeers((p) => ({ ...p, [from]: { ...c, id: from, seen: Date.now() } })),
    )
    s.onPeersChange((ids) =>
      setPeers((p) => Object.fromEntries(Object.entries(p).filter(([id]) => ids.includes(id)))),
    )
    s.onPeerJoin((id) => {
      if (sharedRef.current.ts > 0) s.sendStateTo(id, sharedRef.current)
      const all = Object.values(layoutRef.current)
      if (all.length) s.sendLayout(all, id)
      if (playRef.current) s.sendPlay(playRef.current, id)
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

  const setActive = useCallback(
    (i: number) => {
      const active = Math.max(0, Math.min(slideCount - 1, i))
      const st = { active, ts: Date.now(), by: sync.current?.selfId ?? '' }
      sharedRef.current = st
      setShared(st)
      sync.current?.sendState(st)
    },
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

  /** Broadcast this presenter's camera, so others can follow it (follow mode). */
  const sendView = useCallback((v: ViewMsg) => {
    myView.current = v
    sync.current?.sendView(v)
  }, [])

  /** (Re)play an animation of a slide for everyone. */
  const playAnim = useCallback((slide: string, anim: number) => {
    const p = { slide, anim, ts: Math.max(Date.now(), (playRef.current?.ts ?? 0) + 1), by: sync.current?.selfId ?? '' }
    setPlay((playRef.current = p))
    sync.current?.sendPlay(p)
  }, [])

  const sendCursor = useCallback((x?: number, y?: number) => {
    lastPos.current = { x, y }
    announce()
  }, [announce])

  return { active: shared.active, activeTs: shared.ts, play, playAnim, setActive, peers: Object.values(peers), sendCursor, layout, moveSlides, views, sendView }
}
