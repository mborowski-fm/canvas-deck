/**
 * Hej UI! (loop): a carousel of moods. Every 2 s the row of faces slides one place to the left
 * (firm spring, small settle): the leftmost face leaves the frame, a new one comes in on the
 * right, and the face that lands in the middle does a small hop, like it is answering "Dobry?".
 * Five faces fill the frame edge to edge, so a sixth (a copy of the happy face) waits off-frame.
 * Rest pose = the Figma design.
 */
import { around, clamp01, layerFinder, makeRig, spring } from '../motion'

const FACES = ['Pattern / mood_bad', 'Pattern / sentiment_neutral', 'Pattern / mood', 'Pattern / sentiment_very_dissatisfied', 'Pattern / sentiment_stressed']
const X0 = -166 // left edge of the first face in the design
const STEP = 460 // distance between faces
const SIZE = 412
const CY = 376 + SIZE / 2
const N = 6 // five visible places + one off-frame
const HOLD = 2 // seconds per step
const MOVE = { freq: 1.1, damping: 0.74 }
const MOVE_AT = 0.9 // seconds of stillness before each move

export function carouselRig(root: HTMLElement, prefix: string) {
  const $ = layerFinder(root, prefix)
  const faces = FACES.map($).filter(Boolean) as SVGGraphicsElement[]
  // the sixth face: a copy of the happy one, parked off-frame on the right
  let extra = root.querySelector<SVGGElement>('[data-extra-face]')
  const happy = $('Pattern / mood')
  if (!extra && happy) {
    extra = happy.cloneNode(true) as SVGGElement
    extra.removeAttribute('id')
    extra.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id')) // its mask still points at the original
    extra.setAttribute('data-extra-face', '')
    happy.parentNode?.appendChild(extra)
  }
  const all = extra ? [...faces, extra] : faces
  const homeX = (i: number) => X0 + STEP * (i < 5 ? i : 2) // the copy is drawn where the happy face is

  return makeRig(
    (t) => {
      if (t === null) {
        faces.forEach((f) => f.removeAttribute('transform'))
        extra?.setAttribute('opacity', '0')
        return
      }
      extra?.setAttribute('opacity', '1')
      const step = Math.floor(t / HOLD)
      const u = t - step * HOLD
      const p = spring(u - MOVE_AT, MOVE.freq, MOVE.damping) // each step: hold, then move one place left
      all.forEach((f, i) => {
        // place k: 0..4 visible (left to right), 5 off-frame right; the face at place 0 leaves to the left
        const k = (((i - step) % N) + N) % N
        const x = X0 + STEP * (k - p)
        const lands = k === 3 // moving into the middle place
        const hop = lands ? Math.max(0, Math.sin(clamp01((u - MOVE_AT - 0.45) / 0.35) * Math.PI)) : 0
        const squash = lands ? 1 - 0.06 * Math.max(0, Math.sin(clamp01((u - MOVE_AT - 0.35) / 0.12) * Math.PI)) : 1
        f.setAttribute(
          'transform',
          `translate(${(x - homeX(i)).toFixed(2)} ${(-40 * hop).toFixed(2)}) ${around(homeX(i) + SIZE / 2, CY + SIZE / 2, `scale(${(2 - squash).toFixed(3)} ${squash.toFixed(3)})`)}`,
        )
      })
    },
    { loop: HOLD * N },
  )
}
