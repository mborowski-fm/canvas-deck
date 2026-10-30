import { useEffect, useMemo, useRef, useState } from 'react'
import { AlignBar } from './canvas/AlignBar'
import { align, type AlignOp } from './canvas/align'
import { Canvas, type ViewReq } from './canvas/Canvas'
import { channelName, type ChannelMsg } from './channel'
import { NotesWindow } from './notes/NotesWindow'
import { slides as baseSlides } from './slides/registry'
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
  const { active, setActive, peers, sendCursor, layout, moveSlides } = useRoom(room, me, baseSlides.length)
  // registry positions + shared edits from the room
  const slides = useMemo(
    () => baseSlides.map((s) => (layout[s.id] ? { ...s, x: layout[s.id].x, y: layout[s.id].y } : s)),
    [layout],
  )
  const [view, setView] = useState<ViewReq>({ n: 0, mode: 'all' })
  const [edit, setEdit] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [copied, setCopied] = useState<'link' | 'layout' | null>(null)
  const ch = useRef<BroadcastChannel | null>(null)
  const st = useRef({ active, edit, selected, slides })
  st.current = { active, edit, selected, slides }

  // Bridge to the presenter-notes window.
  useEffect(() => {
    const c = new BroadcastChannel(channelName(room))
    ch.current = c
    const say = () => c.postMessage({ type: 'active', active: st.current.active } satisfies ChannelMsg)
    c.onmessage = (e: MessageEvent<ChannelMsg>) => {
      if (e.data.type === 'hello') say()
      if (e.data.type === 'goto') setActive(e.data.index)
    }
    return () => c.close()
  }, [room, setActive])
  useEffect(() => {
    ch.current?.postMessage({ type: 'active', active } satisfies ChannelMsg)
  }, [active])

  const openNotes = () => window.open(`#/r/${room}/notes`, `notes-${room}`, 'width=520,height=760')
  const flash = (k: 'link' | 'layout') => { setCopied(k); setTimeout(() => setCopied(null), 1500) }
  const fitView = (mode: 'all' | 'active') => setView((v) => ({ n: v.n + 1, mode }))

  const doAlign = (op: AlignOp) => {
    const { slides: sl, selected: sel } = st.current
    moveSlides(align(sl.filter((s) => sel.includes(s.id)), op))
  }

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      const { active: a, edit: ed, selected: sel, slides: sl } = st.current
      const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
      if (ed) {
        if (arrows[e.key] && sel.length) {
          e.preventDefault()
          const step = e.shiftKey ? 100 : 10
          const [dx, dy] = arrows[e.key]
          moveSlides(sl.filter((s) => sel.includes(s.id)).map((s) => ({ id: s.id, x: s.x + dx * step, y: s.y + dy * step })))
        } else if (e.key === 'Escape') setSelected([])
        else if ((e.metaKey || e.ctrlKey) && e.key === 'a') { e.preventDefault(); setSelected(sl.map((s) => s.id)) }
      } else if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); setActive(a + 1) }
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) setActive(a - 1)
      if (e.metaKey || e.ctrlKey) return
      if (e.key === 'o') fitView('all')
      else if (e.key === 'f') fitView('active')
      else if (e.key === 'n') openNotes()
      else if (e.key === 'e') setEdit((v) => !v)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  const copyLink = async () => {
    await navigator.clipboard.writeText(location.href.split('#')[0] + `#/r/${room}`)
    flash('link')
  }
  const copyLayout = async () => {
    const out = Object.fromEntries(slides.map((s) => [s.id, { x: Math.round(s.x), y: Math.round(s.y) }]))
    await navigator.clipboard.writeText(JSON.stringify(out, null, 2) + '\n')
    flash('layout')
  }

  return (
    <>
      <Canvas
        slides={slides}
        active={active}
        onActive={setActive}
        peers={peers}
        onCursor={sendCursor}
        view={view}
        edit={edit}
        selected={selected}
        onSelected={setSelected}
        onMove={moveSlides}
      />
      <div className="hud top-left">
        <div className="file">
          <span className="logo" />
          Canvas Deck <small>/ {room}</small>
        </div>
      </div>
      <div className="hud top-right">
        <div className="avatars">
          <span className="avatar" style={{ background: me.color }} title={`${me.name} (you)`}>
            {me.name[0]?.toUpperCase()}
          </span>
          {peers.map((p) => (
            <span key={p.id} className="avatar" style={{ background: p.color }} title={p.name}>
              {p.name[0]?.toUpperCase()}
            </span>
          ))}
        </div>
        <button className="primary" onClick={copyLink}>{copied === 'link' ? 'Link copied' : 'Share'}</button>
      </div>
      {edit && <AlignBar count={selected.length} onAlign={doAlign} onCopyLayout={copyLayout} copied={copied === 'layout'} />}
      <div className="hud bottom toolbar">
        <button className="icon" title="Previous" onClick={() => setActive(active - 1)} disabled={active === 0}>&lsaquo;</button>
        <span className="counter">{active + 1} / {slides.length}</span>
        <button className="icon" title="Next" onClick={() => setActive(active + 1)} disabled={active >= slides.length - 1}>&rsaquo;</button>
        <i className="sep" />
        <button className="text" title="Fit all slides (O)" onClick={() => fitView('all')}>Overview</button>
        <button className="text" title="Fit active slide (F)" onClick={() => fitView('active')}>Focus</button>
        <i className="sep" />
        <button className={'switch' + (edit ? ' on' : '')} role="switch" aria-checked={edit} title="Edit canvas (E)" onClick={() => setEdit((v) => !v)}>
          <span className="track"><span className="knob" /></span>
          Edit
        </button>
        <i className="sep" />
        <button className="text" title="Open presenter notes (N)" onClick={openNotes}>Notes</button>
      </div>
    </>
  )
}
