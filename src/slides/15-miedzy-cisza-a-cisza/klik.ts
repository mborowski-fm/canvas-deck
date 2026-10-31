/**
 * Między ciszą a ciszą (loop): the right finger hammers the red button, hard and nervously:
 * irregular quick presses in bursts, a little shake. The button squashes under it. Every press
 * leaves a "KLIK" label around the button (like the design); at most 12 stay, the oldest fades
 * out when a new one lands. Deterministic (seeded), so every screen shows the same presses.
 * Rest pose = the Figma design.
 */
import { around, clamp01, layerFinder, makeRig, rand, spring } from '../motion'

const FINGER = ['Rectangle 112', 'Rectangle 113', 'Line 13']
const UP = -70 // finger raised (px; more would cover the title); 0 = pressed, as in the design
const BUTTON_BASE = 1032 // bottom of the button
const BUTTON_PRESSED_H = 78 // button height in the design (pressed)
const BUTTON_FULL_H = 164 // height when released (same as the calm button on the left)
const NAIL_GAP = 26 // nail bottom to button top while pressing
const NAIL_BOTTOM = 928
const MAX_LABELS = 12
const LABEL = { id: 'Frame 1240', cx: 1581, cy: 902.5 } // template label and its center
const ORIGINAL_LABELS = ['Frame 1240', 'Frame 1241', 'Frame 1242', 'Frame 1243', 'Frame 1244', 'Frame 1245', 'Frame 1246', 'Frame 1247']

/** press start times: bursts of quick nervous taps with short pauses between bursts */
const presses: number[] = []
function pressesUntil(t: number) {
  while (!presses.length || presses[presses.length - 1] < t + 1) {
    const i = presses.length
    const prev = presses[i - 1] ?? 0.4
    const pause = rand(i * 7 + 1) < 0.18 ? 0.55 + rand(i * 7 + 2) * 0.5 : 0
    presses.push(prev + 0.17 + rand(i * 7 + 3) * 0.22 + pause)
  }
  return presses
}

/** finger offset for one press starting at p: snap down, tiny hold, spring back up */
function pressOffset(u: number) {
  if (u < 0) return UP
  if (u < 0.05) return UP * (1 - u / 0.05) // hard and fast down
  if (u < 0.09) return 0
  return UP * spring(u - 0.09, 4, 0.55)
}

export function klikRig(root: HTMLElement, prefix: string) {
  const $ = layerFinder(root, prefix)
  const finger = FINGER.map($)
  const button = $('Pattern / Rectangle 110')
  const originals = ORIGINAL_LABELS.map($)
  const template = $(LABEL.id)
  // a pool of label copies, made once
  const pool: SVGGElement[] = []
  if (template) {
    let host = root.querySelector<SVGGElement>('[data-klik-pool]')
    if (!host) {
      host = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      host.setAttribute('data-klik-pool', '')
      template.parentNode?.appendChild(host)
      for (let i = 0; i < MAX_LABELS + 1; i++) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        const c = template.cloneNode(true) as SVGGElement
        c.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'))
        c.removeAttribute('id')
        g.appendChild(c)
        host.appendChild(g)
      }
    }
    pool.push(...(Array.from(host.children) as SVGGElement[]))
  }

  return makeRig(
    (t) => {
      if (t === null) {
        finger.forEach((f) => f?.removeAttribute('transform'))
        button?.removeAttribute('transform')
        originals.forEach((o) => o?.removeAttribute('opacity'))
        pool.forEach((g) => g.setAttribute('opacity', '0'))
        return
      }
      originals.forEach((o) => o?.setAttribute('opacity', '0'))
      const ps = pressesUntil(t)
      let last = -1
      while (last + 1 < ps.length && ps[last + 1] <= t) last++
      // finger: the most recent press, plus a nervous shake
      const u = last >= 0 ? t - ps[last] : -1
      const y = last >= 0 ? pressOffset(u) : UP
      const shake = Math.sin(t * 47) * 2.2 + Math.sin(t * 31) * 1.4
      finger.forEach((f) => f?.setAttribute('transform', `translate(${shake.toFixed(2)} ${y.toFixed(2)})`))
      // button squashes as the nail pushes it
      const top = Math.min(BUTTON_BASE - BUTTON_PRESSED_H, Math.max(BUTTON_BASE - BUTTON_FULL_H, NAIL_BOTTOM + y + NAIL_GAP))
      const sy = (BUTTON_BASE - top) / BUTTON_PRESSED_H
      button?.setAttribute('transform', around(1392, BUTTON_BASE, `scale(1 ${sy.toFixed(4)})`))
      // labels: the last 12 presses; the 13th oldest fades out
      pool.forEach((g) => g.setAttribute('opacity', '0'))
      for (let k = 0; k <= MAX_LABELS && last - k >= 0; k++) {
        const i = last - k
        const g = pool[i % pool.length]
        const age = t - ps[i]
        const leaving = k === MAX_LABELS ? clamp01((t - ps[last]) / 0.18) : 0
        const left = rand(i * 13 + 5) < 0.5
        const X = left ? 1100 + rand(i * 13 + 6) * 130 : 1560 + rand(i * 13 + 7) * 150
        const Y = 690 + rand(i * 13 + 8) * 250
        const r = -45 + rand(i * 13 + 9) * 90
        const s = spring(age, 3.5, 0.45) * (1 - leaving * 0.4)
        g.setAttribute('opacity', (1 - leaving).toFixed(3))
        g.setAttribute('transform', `translate(${X.toFixed(1)} ${Y.toFixed(1)}) rotate(${r.toFixed(1)}) scale(${s.toFixed(3)}) translate(${-LABEL.cx} ${-LABEL.cy})`)
      }
    },
  )
}
