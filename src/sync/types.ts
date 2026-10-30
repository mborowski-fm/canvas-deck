export type LayoutItem = { id: string; x: number; y: number; ts: number }
export type LayoutMsg = { items: LayoutItem[] }

/**
 * A presenter's view, for follow mode: the world rect the camera shows (`fly` = animated move),
 * their active slide and the animation playing on it (`key` changes on every (re)play).
 */
export type ViewMsg = {
  cx: number; cy: number; w: number; h: number; fly: boolean
  active: number
  play: { anim: number; key: string } | null
}

export type Me = {
  name: string
  color: string
}

export type CursorMsg = Me & {
  /** World coordinates, so every viewer sees it on the same spot of the canvas. */
  x?: number
  y?: number
}

export interface Peer extends Me {
  id: string
  x?: number
  y?: number
  seen: number
}

/**
 * The only thing the app knows about networking. To swap P2P for a
 * WebSocket server (e.g. Cloudflare Durable Object), implement this
 * interface and change the import in src/sync/index.ts.
 */
export interface Sync {
  selfId: string
  setMe(me: Me): void
  sendCursor(c: CursorMsg): void
  onCursor(cb: (c: CursorMsg, from: string) => void): void
  onPeersChange(cb: (ids: string[]) => void): void
  /** Called when a new peer joins, so we can hand them the current state. */
  onPeerJoin(cb: (id: string) => void): void
  sendLayout(items: LayoutItem[], to?: string): void
  sendView(v: ViewMsg, to?: string): void
  onView(cb: (v: ViewMsg, from: string) => void): void
  onLayout(cb: (items: LayoutItem[]) => void): void
  leave(): void
}
