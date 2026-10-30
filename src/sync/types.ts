/** Shared by everyone in the room. Last write wins (ts, then `by`). */
export type SharedState = {
  active: number
  ts: number
  by: string
}

export type LayoutItem = { id: string; x: number; y: number; ts: number }
export type LayoutMsg = { items: LayoutItem[] }

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
  sendState(s: SharedState): void
  sendCursor(c: CursorMsg): void
  onState(cb: (s: SharedState, from: string) => void): void
  onCursor(cb: (c: CursorMsg, from: string) => void): void
  onPeersChange(cb: (ids: string[]) => void): void
  /** Called when a new peer joins, so we can hand them the current state. */
  onPeerJoin(cb: (id: string) => void): void
  sendStateTo(id: string, s: SharedState): void
  sendLayout(items: LayoutItem[], to?: string): void
  onLayout(cb: (items: LayoutItem[]) => void): void
  leave(): void
}
