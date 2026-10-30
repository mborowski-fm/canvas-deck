import type { SlideMeta } from '../types'

export const meta: SlideMeta = { title: 'Intro' }

export default function Intro() {
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,#0b1220,#1d3b6e)', color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 140, margin: 0 }}>Canvas Deck</h1>
        <p style={{ fontSize: 48, opacity: 0.8 }}>One big canvas. Many presenters.</p>
      </div>
    </div>
  )
}
