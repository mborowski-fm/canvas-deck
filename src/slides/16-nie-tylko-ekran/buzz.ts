/**
 * Nie tylko ekran (loop): the finger pushes up into the round button with a tap-tap rhythm; the
 * button gives a little under it, and on every press the zigzag lines on both sides buzz like
 * haptic feedback (a short, fast, decaying shake). Rest pose = the Figma design.
 */
import { around, layerFinder, makeRig, spring, wobble } from '../motion'

const FINGER = ['Rectangle 108', 'Rectangle 109', 'Line 12']
const DOWN = 70 // finger pulled back (px, finger points up)
const PRESSES = [0.5, 0.85, 2.3] // tap-tap, pause, tap
const LOOP = 3.2
const LINES = ['jagged line', 'jagged line_2', 'jagged line_3', 'jagged line_4', 'jagged line_5', 'jagged line_6']

const fingerY = (t: number) => {
  // between presses the finger rests pulled back; each press pushes up fast and springs back
  let y = DOWN
  for (const p of PRESSES) {
    const u = t - p
    if (u < 0 || u > 0.6) continue
    y = Math.min(y, u < 0.06 ? DOWN * (1 - u / 0.06) : DOWN * spring(u - 0.06, 3.2, 0.6))
  }
  return y
}

export function buzzRig(root: HTMLElement, prefix: string) {
  const $ = layerFinder(root, prefix)
  const finger = FINGER.map($)
  const button = $('Pattern / Ellipse 14')
  const lines = LINES.map($)
  return makeRig(
    (t) => {
      if (t === null) {
        ;[...finger, button, ...lines].forEach((e) => e?.removeAttribute('transform'))
        return
      }
      const y = fingerY(t)
      finger.forEach((f) => f?.setAttribute('transform', `translate(0 ${y.toFixed(2)})`))
      // the button gives a little while the finger is fully in
      const press = 1 - Math.min(1, y / 12)
      button?.setAttribute('transform', around(960, 388, `scale(${(1 + press * 0.02).toFixed(4)} ${(1 - press * 0.035).toFixed(4)})`))
      lines.forEach((l, i) => {
        const dir = i % 2 ? -1 : 1
        let dx = 0, sy = 1
        for (const p of PRESSES) {
          dx += wobble(t - p - 0.05, 9 * dir, 13, 9)
          sy += wobble(t - p - 0.05, 0.03, 9, 8)
        }
        l?.setAttribute('transform', around(i < 3 ? 1419 : 501, 588, `translate(${dx.toFixed(2)} 0) scale(1 ${sy.toFixed(4)})`))
      })
    },
    { loop: LOOP },
  )
}
