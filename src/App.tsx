import { useEffect, useRef, useState } from 'react'
import { Canvas } from './canvas/Canvas'
import { channelName, type ChannelMsg } from './channel'
import { NotesWindow } from './notes/NotesWindow'
import { slides } from './slides/registry'
import type { Me } from './sync'
import { useRoom } from './useRoom'

const COLORS = ['#e5484d', '#f76b15', '#30a46c', '#0091ff', '#8e4ec6', '#d6409f', '#12a594']

// Routes (hash based, works on GitHub Pages): #/r/<room>  and  #/r/<room>/notes
function parseHash() {
  const m = location.hash.match(/^#\/r\/([^/]+)(\/notes)?/)
  return m ? { room: decodeURIComponent(m[1]), notes: !!m[2] } : null
}

function loadMe(): Me | null {
  try {
    const raw = localStorage.getItem('canvas-deck:me')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function App() {
  const [route, setRoute] = useState(parseHash())
  useEffect(() => {
    const f = () => setRoute(parseHash())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])

  useEffect(() => {
    if (!route) {
      const id = Math.random().toString(36).slice(2, 8)
      location.replace(`#/r/${id}`)
    }
  }, [route])

  if (!route) return null
  if (route.notes) return <NotesWindow room={route.room} />
  return <Deck room={route.room} />
}

function Deck({ room }: { room: string }) {
  const [me, setMe] = useState<Me | null>(loadMe())
  if (!me) return <NamePrompt onDone={(m) => { localStorage.setItem('canvas-deck:me', JSON.stringify(m)); setMe(m) }} />
  return <Presenting room={room} me={me} />
}

function NamePrompt({ onDone }: { onDone: (m: Me) => void }) {
  const [name, setName] = useState('')
  return (
    <div className="modal">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim())
            onDone({ name: name.trim(), color: COLORS[Math.floor(Math.random() * COLORS.length)] })
        }}
      >
        <h2>Join the presentation</h2>
        <input autoFocus placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit">Join</button>
      </form>
    </div>
  )
}

function Presenting({ room, me }: { room: string; me: Me }) {
  const { active, setActive, peers, sendCursor } = useRoom(room, me, slides.length)
  const [overview, setOverview] = useState(0)
  const [copied, setCopied] = useState(false)
  const ch = useRef<BroadcastChannel | null>(null)
  const activeRef = useRef(active)
  activeRef.current = active

  // Bridge to the presenter-notes window.
  useEffect(() => {
    const c = new BroadcastChannel(channelName(room))
    ch.current = c
    const say = () => c.postMessage({ type: 'active', active: activeRef.current } satisfies ChannelMsg)
    c.onmessage = (e: MessageEvent<ChannelMsg>) => {
      if (e.data.type === 'hello') say()
      if (e.data.type === 'goto') setActive(e.data.index)
    }
    return () => c.close()
  }, [room, setActive])
  useEffect(() => {
    ch.current?.postMessage({ type: 'active', active } satisfies ChannelMsg)
  }, [active])

  const openNotes = () =>
    window.open(`#/r/${room}/notes`, `notes-${room}`, 'width=520,height=760')

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); setActive(activeRef.current + 1) }
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) setActive(activeRef.current - 1)
      else if (e.key === 'o') setOverview((n) => n + 1)
      else if (e.key === 'f') setActive(activeRef.current) // re-fit and re-broadcast
      else if (e.key === 'n') openNotes()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  const copy = async () => {
    await navigator.clipboard.writeText(location.href.split('#')[0] + `#/r/${room}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <Canvas
        slides={slides}
        active={active}
        onSelect={setActive}
        peers={peers}
        onCursor={sendCursor}
        overviewSignal={overview}
      />
      <div className="hud top-left">
        <button onClick={copy}>{copied ? 'Link copied' : 'Copy invite link'}</button>
      </div>
      <div className="hud top-right">
        <span className="chip" style={{ borderColor: me.color }}>
          <i style={{ background: me.color }} />
          {me.name} (you)
        </span>
        {peers.map((p) => (
          <span key={p.id} className="chip" style={{ borderColor: p.color }}>
            <i style={{ background: p.color }} />
            {p.name}
          </span>
        ))}
      </div>
      <div className="hud bottom">
        <button onClick={() => setActive(active - 1)} disabled={active === 0}>Prev</button>
        <span>{active + 1} / {slides.length}</span>
        <button onClick={() => setActive(active + 1)} disabled={active >= slides.length - 1}>Next</button>
        <button onClick={() => setOverview((n) => n + 1)}>Overview</button>
        <button onClick={openNotes}>Notes window</button>
      </div>
    </>
  )
}
