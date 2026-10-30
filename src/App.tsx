import { useEffect, useMemo, useRef, useState } from 'react'
import { AlignBar } from './canvas/AlignBar'
import { align, type AlignOp, type Pos } from './canvas/align'
import { Canvas, type CamView, type ViewReq } from './canvas/Canvas'
import { channelName, type ChannelMsg } from './channel'
import { NotesWindow } from './notes/NotesWindow'
import { slides as baseSlides } from './slides/registry'
import type { Me } from './sync'
import { Icon } from './Icon'
import { canSave, saveLayoutToRepo, uploadMedia } from './save'
import { useRoom } from './useRoom'
import { AddDialog } from './canvas/AddDialog'
import { baseItems, DEFAULT_SIZE, detectKind, mediaSize, newItemId, type CanvasItem } from './items'

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
  const { active, activeTs, play, playAnim, setActive, peers, sendCursor, layout, moveSlides, views, sendView } = useRoom(room, me, baseSlides.length)
  // registry positions + shared edits from the room
  const slides = useMemo(
    () => baseSlides.map((s) => (layout[s.id] ? { ...s, x: layout[s.id].x, y: layout[s.id].y } : s)),
    [layout],
  )
  // follow mode: see another presenter's view (camera, active slide, animation); click their avatar
  const [following, setFollowing] = useState<string | null>(null)
  const lead = following ? views[following] ?? null : null
  // Animation of the active slide: when following, the leader's; else the last (re)play of this
  // slide, or autoplay on entering a slide with exactly one animation (or idle loop).
  const activeSlide = slides[active]
  const ownPlay = useMemo(() => {
    if (!activeSlide?.animations.length) return null
    if (play && play.slide === activeSlide.id && play.ts > activeTs) return { anim: play.anim, key: `play:${play.ts}` }
    return activeSlide.animations.length === 1 ? { anim: 0, key: `enter:${activeTs}` } : null
  }, [activeSlide, play, activeTs])
  const activePlay = lead ? lead.play : ownPlay
  useEffect(() => {
    if (lead && lead.active !== active) setActive(lead.active) // mirror the leader's slide, locally
  }, [lead, active, setActive])
  const replay = () => activeSlide?.animations.length && playAnim(activeSlide.id, activePlay?.anim ?? 0)
  // navigating yourself (click, keys, toolbar, notes window) stops following
  const navigate = (i: number) => {
    setFollowing(null)
    setActive(i)
  }
  const goTo = (i: number) => i !== active && navigate(i)
  const [view, setView] = useState<ViewReq>({ n: 0, mode: 'all' })
  const [edit, setEdit] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [flashMsg, setFlashMsg] = useState<string | null>(null)
  // free canvas elements: local to this presenter (not synced), saved to items.json in dev
  const [items, setItems] = useState<CanvasItem[]>(baseItems)
  const [adding, setAdding] = useState(false)
  const leader = peers.find((p) => p.id === following)
  // share this presenter's view (camera + slide + animation) for anyone following
  const lastCam = useRef<CamView | null>(null)
  const viewState = useRef({ active, activePlay })
  viewState.current = { active, activePlay }
  const shareView = () => {
    if (lastCam.current) sendView({ ...lastCam.current, active: viewState.current.active, play: viewState.current.activePlay })
  }
  useEffect(() => {
    if (lastCam.current) lastCam.current = { ...lastCam.current, fly: false }
    shareView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, activePlay?.key])
  useEffect(() => {
    if (following && !leader) setFollowing(null) // they left
  }, [following, leader])
  const centerRef = useRef<() => { x: number; y: number }>(() => ({ x: 0, y: 0 }))
  const ch = useRef<BroadcastChannel | null>(null)
  const st = useRef({ active, edit, selected, slides, items })
  st.current = { active, edit, selected, slides, items }

  // Bridge to the presenter-notes window.
  useEffect(() => {
    const c = new BroadcastChannel(channelName(room))
    ch.current = c
    const say = () => c.postMessage({ type: 'active', active: st.current.active } satisfies ChannelMsg)
    c.onmessage = (e: MessageEvent<ChannelMsg>) => {
      if (e.data.type === 'hello') say()
      if (e.data.type === 'goto') navigate(e.data.index)
    }
    return () => c.close()
  }, [room, setActive])
  useEffect(() => {
    ch.current?.postMessage({ type: 'active', active } satisfies ChannelMsg)
  }, [active])

  const openNotes = () => window.open(`#/r/${room}/notes`, `notes-${room}`, 'width=520,height=760')
  const flash = (msg: string) => { setFlashMsg(msg); setTimeout(() => setFlashMsg(null), 1500) }
  const fitView = (mode: 'all' | 'active') => setView((v) => ({ n: v.n + 1, mode }))

  // Edits are lists of changes: a slide position (Pos), or an element's full state (`item: null` = removed).
  type Change = Pos | { id: string; item: CanvasItem | null }
  const isSlide = (id: string) => st.current.slides.some((s) => s.id === id)
  const apply = (list: Change[]) => {
    moveSlides(list.filter((c): c is Pos => !('item' in c) && isSlide(c.id)))
    const its = list.filter((c) => !isSlide(c.id))
    if (!its.length) return
    setItems((prev) => {
      const m = new Map(prev.map((i) => [i.id, i]))
      for (const c of its) {
        if ('item' in c) {
          if (c.item) m.set(c.id, c.item)
          else m.delete(c.id)
        } else {
          const cur = m.get(c.id)
          if (cur) m.set(c.id, { ...cur, x: c.x, y: c.y })
        }
      }
      return [...m.values()]
    })
  }

  // Undo/redo for canvas edits (local to this presenter; slide moves themselves are shared).
  const hist = useRef<{ undo: Change[][]; redo: Change[][] }>({ undo: [], redo: [] })
  const [, setHistTick] = useState(0)
  const snapshot = (ids: string[]): Change[] =>
    ids.map((id) => {
      const s = st.current.slides.find((x) => x.id === id)
      if (s) return { id, x: s.x, y: s.y }
      return { id, item: st.current.items.find((x) => x.id === id) ?? null }
    })
  const record = (ids: string[]) => {
    if (!ids.length) return
    hist.current.undo.push(snapshot(ids))
    hist.current.redo = []
    setHistTick((n) => n + 1)
  }
  const commit = (list: Change[]) => {
    record(list.map((c) => c.id))
    apply(list)
  }
  const step = (from: 'undo' | 'redo') => {
    const h = hist.current
    const list = h[from].pop()
    if (!list) return
    h[from === 'undo' ? 'redo' : 'undo'].push(snapshot(list.map((c) => c.id)))
    apply(list)
    setHistTick((n) => n + 1)
  }
  const objects = () => [...st.current.slides, ...st.current.items]

  // Adding elements: by link (any presenter) or local file (dev: uploaded into public/media/).
  const addAt = async (entries: { src: string; kind: CanvasItem['kind'] }[], at: { x: number; y: number }) => {
    const added: CanvasItem[] = []
    for (const [n, e] of entries.entries()) {
      const size = e.kind === 'image' || e.kind === 'video' ? await mediaSize(e.kind, e.src) : DEFAULT_SIZE[e.kind]
      added.push({ id: newItemId(), kind: e.kind, src: e.src, x: Math.round(at.x - size.width / 2 + n * 60), y: Math.round(at.y - size.height / 2 + n * 60), ...size })
    }
    commit(added.map((it) => ({ id: it.id, item: it })))
    setSelected(added.map((it) => it.id))
  }
  const addFiles = async (files: File[], at: { x: number; y: number }) => {
    const media = files.filter((f) => /^(image|video)\//.test(f.type))
    if (!media.length) return
    if (!canSave) return flash('Files: localhost only')
    try {
      const entries = []
      for (const f of media) entries.push({ src: await uploadMedia(f), kind: (f.type.startsWith('image') ? 'image' : 'video') as CanvasItem['kind'] })
      await addAt(entries, at)
    } catch (err) {
      console.error(err)
      flash('Upload failed')
    }
  }
  const addLink = async (url: string, at = centerRef.current()) => addAt([{ src: url, kind: await detectKind(url) }], at)
  const onDrop = (data: DataTransfer, at: { x: number; y: number }) => {
    if (data.files.length) return void addFiles([...data.files], at)
    const url = (data.getData('text/uri-list') || data.getData('text/plain')).split('\n')[0].trim()
    if (/^https?:\/\//.test(url)) void addLink(url, at)
  }
  const deleteSelected = () => {
    const ids = st.current.selected.filter((id) => !isSlide(id))
    if (!ids.length) return
    commit(ids.map((id) => ({ id, item: null })))
    setSelected(st.current.selected.filter((id) => isSlide(id)))
  }

  const doAlign = (op: AlignOp) => {
    commit(align(objects().filter((o) => st.current.selected.includes(o.id)), op))
  }

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return
      const { active: a, edit: ed, selected: sel } = st.current
      const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
      // Left/Right always change the slide, in every mode, like the arrow buttons in the toolbar.
      // In edit mode Alt+arrows nudge the selection (Shift = 100 px); Space is reserved for panning.
      if (ed && e.altKey && arrows[e.key] && sel.length) {
        e.preventDefault()
        const nudge = e.shiftKey ? 100 : 10
        const [dx, dy] = arrows[e.key]
        commit(objects().filter((o) => sel.includes(o.id)).map((o) => ({ id: o.id, x: o.x + dx * nudge, y: o.y + dy * nudge })))
      } else if (['ArrowRight', 'PageDown'].includes(e.key) || (!ed && e.key === ' ')) { e.preventDefault(); navigate(a + 1) }
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); navigate(a - 1) }
      else if (ed) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); step(e.shiftKey ? 'redo' : 'undo') }
        else if ((e.metaKey || e.ctrlKey) && e.key === 'y') { e.preventDefault(); step('redo') }
        else if (e.key === 'Escape') setSelected([])
        else if ((e.metaKey || e.ctrlKey) && e.key === 'a') { e.preventDefault(); setSelected(objects().map((o) => o.id)) }
        else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected() }
      }
      if (e.metaKey || e.ctrlKey) return
      if (e.key === 'o') fitView('all')
      else if (e.key === 'f') fitView('active')
      else if (e.key === 'n') openNotes()
      else if (e.key === 'e') setEdit((v) => !v)
      else if (e.key === 'r') replay()
      else if (e.key === 'Escape') setFollowing(null)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  // Dev only: write layout.json into the repo.
  const saveLayout = async () => {
    const out = Object.fromEntries(slides.map((s) => [s.id, { x: Math.round(s.x), y: Math.round(s.y) }]))
    flash((await saveLayoutToRepo(out, items)) ? 'Saved' : 'Save failed')
  }
  const resetLayout = () => commit(baseSlides.map((s) => ({ id: s.id, x: s.x, y: s.y })))

  return (
    <>
      <Canvas
        slides={slides}
        items={items}
        centerRef={centerRef}
        onDrop={onDrop}
        onResize={(id, width, height) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, width, height } : i)))}
        active={active}
        onActive={goTo}
        play={activePlay}
        onPlay={(anim) => activeSlide && playAnim(activeSlide.id, anim)}
        peers={peers}
        onCursor={sendCursor}
        view={view}
        edit={edit}
        selected={selected}
        onSelected={setSelected}
        onView={(cam) => { lastCam.current = cam; shareView() }}
        follow={lead}
        onUserMove={() => following && setFollowing(null)}
        onMove={apply}
        onChangeStart={record}
      />
      <div className="hud top-right">
        <div className="toolbar">
          <div className="connected">
            <button title="Previous slide (Left)" onClick={() => navigate(active - 1)} disabled={active === 0}>
              <Icon name="arrow_back" />
            </button>
            <button title="Next slide (Right)" onClick={() => navigate(active + 1)} disabled={active >= slides.length - 1}>
              <Icon name="arrow_forward" />
            </button>
          </div>
          <button className="icon accent" title="Replay animation (R)" onClick={replay} disabled={!activeSlide?.animations.length}>
            <Icon name="replay" />
          </button>
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
            <button
              key={p.id}
              className={'avatar' + (following === p.id ? ' following' : '')}
              style={{ background: p.color, ['--ring' as string]: p.color }}
              data-tip={following === p.id ? 'Przestań śledzić' : `Śledź ${p.name}`}
              aria-label={following === p.id ? `Przestań śledzić ${p.name}` : `Śledź ${p.name}`}
              onClick={() => setFollowing(following === p.id ? null : p.id)}
            >
              {p.name[0]?.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {leader && (
        <>
          <div className="follow-frame" style={{ ['--ring' as string]: leader.color }} />
          <div className={'hud follow-bar' + (edit ? ' above-edit' : '')}>
            <span className="avatar" style={{ background: leader.color }}>{leader.name[0]?.toUpperCase()}</span>
            Śledzisz <b>{leader.name}</b>
            <button className="cta" onClick={() => setFollowing(null)} title="Esc">
              Przestań
            </button>
          </div>
        </>
      )}
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
          onAdd={() => setAdding(true)}
          onDelete={deleteSelected}
          canDelete={selected.some((id) => !isSlide(id))}
        />
      )}
      {adding && (
        <AddDialog
          canUpload={canSave}
          onClose={() => setAdding(false)}
          onLink={(url) => { setAdding(false); void addLink(url) }}
          onFiles={(files) => { setAdding(false); void addFiles(files, centerRef.current()) }}
        />
      )}
    </>
  )
}
