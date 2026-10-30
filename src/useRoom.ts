import { useCallback, useEffect, useRef, useState } from 'react'
import { createSync, type LayoutItem, type Me, type Peer, type SharedState, type Sync } from './sync'

const newer = (a: SharedState, b: SharedState) =>
  a.ts > b.ts || (a.ts === b.ts && a.by > b.by)

/**
 * Everything multiplayer: the shared active slide + live peers/cursors.
 * Any presenter can change `active`; it is last-write-wins for everyone.
 */
export function useRoom(roomId: string, me: Me, slideCount: number) {
  const [shared, setShared] = useState<SharedState>({ active: 0, ts: 0, by: '' })
  const [peers, setPeers] = useState<Record<string, Peer>>({})
  const [layout, setLayout] = useState<Record<string, LayoutItem>>({})
  const layoutRef = useRef(layout)
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
      const next = { ...layoutRef.current }
      let changed = false
      for (const it of items) {
        if (!next[it.id] || it.ts > next[it.id].ts) {
          next[it.id] = it
          changed = true
        }
      }
      if (changed) {
        layoutRef.current = next
        setLayout(next)
      }
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

  const sendCursor = useCallback((x?: number, y?: number) => {
    lastPos.current = { x, y }
    announce()
  }, [announce])

  return { active: shared.active, setActive, peers: Object.values(peers), sendCursor, layout, moveSlides }
}
