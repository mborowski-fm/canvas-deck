import { useEffect, useMemo, useRef, useState } from 'react'
import { AlignBar } from './canvas/AlignBar'
import { align, type AlignOp, type Pos } from './canvas/align'
import { Canvas, type ViewReq } from './canvas/Canvas'
import { channelName, type ChannelMsg } from './channel'
import { NotesWindow } from './notes/NotesWindow'
import { slides as baseSlides } from './slides/registry'
import type { Me } from './sync'
import { Icon } from './Icon'
import { canSave, saveLayoutToRepo } from './save'
import { useRoom } from './useRoom'

// Presenter colors = Figma Brand variables (see src/tokens.css), readable with paper-colored text.
const COLORS = ['#9a62ee', '#b38c1a', '#4f4ff7', '#ec5a2e', '#e84acf', '#0e5c36', '#3bafea', '#731d1e']

// Routes (hash based, works on GitHub Pages): #/r/<room>  and  #/r/<room>/notes
function parseHash() {
  const m = location.hash.match(/^#\/r\/([^/]+)(\/notes)?/)
  return m ? { room: decodeURIComponent(m[1]), notes: !!m[2] } : null
}

function loadMe(): Me | null {
  try {
    const raw = localStorage.getItem('canvas-deck:me')
    const me: Me | null = raw ? JSON.parse(raw) : null
    // re-pick colors saved before the palette came from Figma
    if (me && !COLORS.includes(me.color)) me.color = COLORS[me.name.length % COLORS.length]
    return me
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
  const [flashMsg, setFlashMsg] = useState<string | null>(null)
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
  const flash = (msg: string) => { setFlashMsg(msg); setTimeout(() => setFlashMsg(null), 1500) }
  const fitView = (mode: 'all' | 'active') => setView((v) => ({ n: v.n + 1, mode }))

  // Undo/redo for layout edits (local to this presenter; the moves themselves are shared).
  const hist = useRef<{ undo: Pos[][]; redo: Pos[][] }>({ undo: [], redo: [] })
  const [, setHistTick] = useState(0)
  const snapshot = (ids: string[]) =>
    st.current.slides.filter((s) => ids.includes(s.id)).map((s) => ({ id: s.id, x: s.x, y: s.y }))
  const record = (before: Pos[]) => {
    if (!before.length) return
    hist.current.undo.push(before)
    hist.current.redo = []
    setHistTick((n) => n + 1)
  }
  const commit = (items: Pos[]) => {
    record(snapshot(items.map((i) => i.id)))
    moveSlides(items)
  }
  const step = (from: 'undo' | 'redo') => {
    const h = hist.current
    const items = h[from].pop()
    if (!items) return
    h[from === 'undo' ? 'redo' : 'undo'].push(snapshot(items.map((i) => i.id)))
    moveSlides(items)
    setHistTick((n) => n + 1)
  }

  const doAlign = (op: AlignOp) => {
    const { slides: sl, selected: sel } = st.current
    commit(align(sl.filter((s) => sel.includes(s.id)), op))
  }

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return
      const { active: a, edit: ed, selected: sel, slides: sl } = st.current
      const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
      if (ed) {
        if (arrows[e.key] && sel.length) {
          e.preventDefault()
          const nudge = e.shiftKey ? 100 : 10
          const [dx, dy] = arrows[e.key]
          commit(sl.filter((s) => sel.includes(s.id)).map((s) => ({ id: s.id, x: s.x + dx * nudge, y: s.y + dy * nudge })))
        } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); step(e.shiftKey ? 'redo' : 'undo') }
        else if ((e.metaKey || e.ctrlKey) && e.key === 'y') { e.preventDefault(); step('redo') }
        else if (e.key === 'Escape') setSelected([])
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

  // Dev only: write layout.json into the repo.
  const saveLayout = async () => {
    const out = Object.fromEntries(slides.map((s) => [s.id, { x: Math.round(s.x), y: Math.round(s.y) }]))
    flash((await saveLayoutToRepo(out)) ? 'Saved' : 'Save failed')
  }
  const resetLayout = () => commit(baseSlides.map((s) => ({ id: s.id, x: s.x, y: s.y })))

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
        onMoveStart={record}
      />
      <div className="hud top-right">
        <div className="toolbar">
          <div className="connected">
            <button title="Previous slide (Left)" onClick={() => setActive(active - 1)} disabled={active === 0}>
              <Icon name="arrow_back" />
            </button>
            <button title="Next slide (Right)" onClick={() => setActive(active + 1)} disabled={active >= slides.length - 1}>
              <Icon name="arrow_forward" />
            </button>
          </div>
          <button className={'icon accent' + (edit ? ' on' : '')} aria-pressed={edit} title="Edit canvas (E)" onClick={() => setEdit((v) => !v)}>
            <Icon name="edit" />
          </button>
          <button className="icon accent" title="Presenter notes (N)" onClick={openNotes}>
            <Icon name="sticky_note_2" />
          </button>
        </div>
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
      </div>
      {edit && (
        <AlignBar
          count={selected.length}
          onAlign={doAlign}
          onUndo={() => step('undo')}
          onRedo={() => step('redo')}
          canUndo={hist.current.undo.length > 0}
          canRedo={hist.current.redo.length > 0}
          onReset={resetLayout}
          onSave={canSave ? saveLayout : undefined}
          saveLabel={flashMsg ?? 'Save layout'}
        />
      )}
    </>
  )
}
