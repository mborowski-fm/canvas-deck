/**
 * Orange lines as guitar strings (slides 03 and 04). When the cursor crosses a line it catches
 * it and drags it into a V (the string bends where the cursor is); when the cursor pulls too far
 * or slides off the end, the string snaps back and vibrates, fading out. Quick flicks pluck it
 * lightly. Interactive: it reacts to each presenter's own cursor (a follower does not see it).
 * The <line> stays in the SVG; while the slide is active it is hidden and drawn as a path.
 */
import { layerFinder, runTimeline, type Rig } from './motion'

const SVG_NS = 'http://www.w3.org/2000/svg'
const GRAB = 6 // px: how close to the line counts as touching it
const MAX_PULL = 42 // px: pulled further than this, the string slips off and rings
const FREQ = 7 // Hz: vibration
const DECAY = 2.6 // 1/s

type Str = {
  line: SVGLineElement
  path: SVGPathElement
  ax: number; ay: number; bx: number; by: number // ends
  len: number; ux: number; uy: number; nx: number; ny: number // direction and normal
  side: number // which side of the line the cursor was on (sign of the normal offset)
  grabbed: boolean
  at: number // 0..1 where along the string it is pulled
  pull: number // current pull (px, along the normal) while grabbed
  ring: number // amplitude of the free vibration (px)
  ringFrom: number // when it started ringing (s)
}

export function stringsRig(ids: string[]) {
  return (root: HTMLElement, prefix: string): Rig => {
    const $ = layerFinder(root, prefix)
    const lines = ids.map($).filter(Boolean) as unknown as SVGLineElement[]
    const rest = () => {
      lines.forEach((l) => l.removeAttribute('visibility'))
      root.querySelectorAll('[data-string]').forEach((p) => p.remove())
    }
    return {
      rest,
      play: () => {
        rest()
        const svg = root.querySelector('svg')
        const strs: Str[] = lines.map((line) => {
          const ax = +line.getAttribute('x1')!, ay = +line.getAttribute('y1')!
          const bx = +line.getAttribute('x2')!, by = +line.getAttribute('y2')!
          const len = Math.hypot(bx - ax, by - ay)
          const ux = (bx - ax) / len, uy = (by - ay) / len
          const path = document.createElementNS(SVG_NS, 'path')
          path.setAttribute('data-string', '')
          for (const a of ['stroke', 'stroke-width']) path.setAttribute(a, line.getAttribute(a) ?? '')
          path.setAttribute('fill', 'none')
          path.setAttribute('stroke-linejoin', 'round')
          line.after(path)
          line.setAttribute('visibility', 'hidden')
          return { line, path, ax, ay, bx, by, len, ux, uy, nx: -uy, ny: ux, side: 0, grabbed: false, at: 0.5, pull: 0, ring: 0, ringFrom: 0 }
        })
        let now = 0
        const release = (s: Str) => {
          s.grabbed = false
          s.ring = s.pull
          s.ringFrom = now
        }
        const onMove = (e: PointerEvent) => {
          const m = svg?.getScreenCTM()
          if (!m) return
          const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
          for (const s of strs) {
            const along = ((p.x - s.ax) * s.ux + (p.y - s.ay) * s.uy) / s.len
            const off = (p.x - s.ax) * s.nx + (p.y - s.ay) * s.ny
            const inside = along > 0.02 && along < 0.98
            if (s.grabbed) {
              if (!inside || Math.abs(off) > MAX_PULL) release(s)
              else { s.at = along; s.pull = off }
            } else if (inside && s.side !== 0 && Math.sign(off) !== s.side && Math.abs(off) < MAX_PULL) {
              // crossed the line: catch it
              s.grabbed = true
              s.at = along
              s.pull = off
            }
            if (!s.grabbed && Math.abs(off) > GRAB) s.side = Math.sign(off)
            if (!inside) s.side = 0
          }
        }
        window.addEventListener('pointermove', onMove)
        const stop = runTimeline((t) => {
          now = t
          for (const s of strs) {
            let d = 0
            if (s.grabbed) d = s.pull
            else if (s.ring) {
              const u = t - s.ringFrom
              d = s.ring * Math.exp(-DECAY * u) * Math.cos(2 * Math.PI * FREQ * u)
              if (Math.abs(s.ring) * Math.exp(-DECAY * u) < 0.3) s.ring = 0
            }
            // a V through the pulled point (round join), like a plucked string
            const px = s.ax + (s.bx - s.ax) * s.at + s.nx * d
            const py = s.ay + (s.by - s.ay) * s.at + s.ny * d
            s.path.setAttribute('d', `M${s.ax} ${s.ay}L${px.toFixed(2)} ${py.toFixed(2)}L${s.bx} ${s.by}`)
          }
        }, rest)
        return () => {
          stop()
          window.removeEventListener('pointermove', onMove)
          rest()
        }
      },
    }
  }
}
