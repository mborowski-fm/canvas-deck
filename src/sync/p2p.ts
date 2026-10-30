import { joinRoom, selfId } from 'trystero'
import type { CursorMsg, LayoutMsg, Me, Sync, ViewMsg } from './types'

const APP_ID = 'futuremind-canvas-deck'

/** Serverless sync over WebRTC. Peers find each other via public Nostr relays. */
export function createP2PSync(roomId: string): Sync {
  const room = joinRoom({ appId: APP_ID }, roomId)
  const cursor = room.makeAction<CursorMsg>('cursor')
  const layout = room.makeAction<LayoutMsg>('layout')
  const view = room.makeAction<ViewMsg>('view')

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
    sendLayout: (items, to) => void layout.send({ items }, to ? { target: to } : undefined),
    onLayout: (cb) => (layout.onMessage = (d) => cb(d.items)),
    sendView: (v, to) => void view.send(v, to ? { target: to } : undefined),
    onView: (cb) => (view.onMessage = (d, { peerId }) => cb(d, peerId)),
    sendCursor: (c) => void cursor.send(c),
    onCursor: (cb) => (cursor.onMessage = (d, { peerId }) => cb(d, peerId)),
    onPeersChange: (cb) => (peersCb = cb),
    onPeerJoin: (cb) => (joinCb = cb),
    leave: () => room.leave(),
  }
}
