import { joinRoom, selfId } from 'trystero'
import type { CursorMsg, LayoutMsg, Me, SharedState, Sync } from './types'

const APP_ID = 'futuremind-canvas-deck'

/** Serverless sync over WebRTC. Peers find each other via public Nostr relays. */
export function createP2PSync(roomId: string): Sync {
  const room = joinRoom({ appId: APP_ID }, roomId)
  const state = room.makeAction<SharedState>('state')
  const cursor = room.makeAction<CursorMsg>('cursor')
  const layout = room.makeAction<LayoutMsg>('layout')

  const ids = new Set<string>()
  let peersCb: (ids: string[]) => void = () => {}
  let joinCb: (id: string) => void = () => {}
  const emit = () => peersCb([...ids])

  room.onPeerJoin = (id) => {
    ids.add(id)
    emit()
    joinCb(id)
  }
  room.onPeerLeave = (id) => {
    ids.delete(id)
    emit()
  }

  return {
    selfId,
    setMe(_me: Me) {},
    sendState: (s) => void state.send(s),
    sendStateTo: (id, s) => void state.send(s, { target: id }),
    sendLayout: (items, to) => void layout.send({ items }, to ? { target: to } : undefined),
    onLayout: (cb) => (layout.onMessage = (d) => cb(d.items)),
    sendCursor: (c) => void cursor.send(c),
    onState: (cb) => (state.onMessage = (d, { peerId }) => cb(d, peerId)),
    onCursor: (cb) => (cursor.onMessage = (d, { peerId }) => cb(d, peerId)),
    onPeersChange: (cb) => (peersCb = cb),
    onPeerJoin: (cb) => (joinCb = cb),
    leave: () => room.leave(),
  }
}
