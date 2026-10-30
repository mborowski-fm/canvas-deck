import { useEffect, useRef, useState } from 'react'
import { slides } from '../slides/registry'
import { channelName, type ChannelMsg } from '../channel'
import { Notes } from './markdown'

/**
 * Presenter window. Open it from the main window (key N) and keep it on your
 * own screen while sharing the other window. It follows the shared active
 * slide via BroadcastChannel (same browser), and can drive it too.
 */
export function NotesWindow({ room }: { room: string }) {
  const [active, setActive] = useState(0)
  const [start, setStart] = useState(Date.now())
  const [now, setNow] = useState(Date.now())
  const ch = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    const c = new BroadcastChannel(channelName(room))
    ch.current = c
    c.onmessage = (e: MessageEvent<ChannelMsg>) => {
      if (e.data.type === 'active') setActive(e.data.active)
    }
    c.postMessage({ type: 'hello' } satisfies ChannelMsg)
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      c.close()
      clearInterval(t)
    }
  }, [room])

  const go = (i: number) => ch.current?.postMessage({ type: 'goto', index: i } satisfies ChannelMsg)

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) go(active + 1)
      if (['ArrowLeft', 'PageUp'].includes(e.key)) go(active - 1)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  const cur = slides[active]
  const next = slides[active + 1]
  const s = Math.floor((now - start) / 1000)
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')

  return (
    <div className="notes-win">
      <header>
        <span>
          Slide {active + 1} / {slides.length}
        </span>
        <button onClick={() => setStart(Date.now())} title="Reset timer">
          {mm}:{ss}
        </button>
      </header>
      <h1>{cur?.title}</h1>
      <main className="notes-body">
        <Notes text={cur?.notes ?? ''} />
      </main>
      <footer>
        <button onClick={() => go(active - 1)} disabled={active === 0}>
          Prev
        </button>
        <div className="next">
          {next ? (
            <>
              <small>Next</small>
              <b>{next.title}</b>
            </>
          ) : (
            <small>Last slide</small>
          )}
        </div>
        <button onClick={() => go(active + 1)} disabled={!next}>
          Next
        </button>
      </footer>
    </div>
  )
}
