/**
 * Hej UI!: the faces stay in place, but their features (eyes + mouth) are alive.
 * - Cursor moves: every face looks at the cursor (direction from the face to the pointer, a bit
 *   further when it is far away).
 * - Cursor idle (still for IDLE s, or outside the window): they look around at each other, like a
 *   group reacting to "Dobry?", in a loop.
 * Every change of target is reached with an eye-like spring (quick, small overshoot, soft
 * settle; same feel as the eye on slide 02), slightly different per face; a faint drift keeps
 * them alive. The features are cut out of the face masks in slide.svg and drawn on top in the
 * background color ("<face> features"), so they can move inside the patterned disc.
 * Note: this follows each presenter's own cursor, so it is the one animation that is not the
 * same for a follower. Rest pose = the Figma design.
 */
import { layerFinder, rand, runTimeline, toSlidePoint, type Rig } from '../motion'

const FACES = ['mood_bad', 'sentiment_neutral', 'mood', 'sentiment_very_dissatisfied', 'sentiment_stressed']
const CENTERS = FACES.map((_, i) => ({ x: 40 + 460 * i, y: 582 })) // face centers in slide px
const R = 34 // px: how far the features move when a face looks fully to one side
const FOLLOW_FAR = 420 // px: cursor this far from a face = a full look
const IDLE = 1.6 // s without cursor movement before they start looking around
const LOOP = 9 // s: the look-around sequence
const FREQ = 3.0, DAMP = 0.6 // eye-like spring

type Look = (i: number) => [number, number] // where face i looks, in units of R
const toward = (j: number): Look => (i) => (i === j ? [0, 0.15] : [Math.sign(j - i), 0.1])
const LOOKS: [number, Look][] = [
  [0.4, toward(2)], // everyone looks at the happy face in the middle
  [1.6, (i) => (i === 2 ? [-1, 0] : toward(2)(i))], // the middle one glances left...
  [2.4, (i) => (i === 2 ? [1, 0] : i < 2 ? [1, -0.2] : [-1, -0.2])], // ...then right; the others peek at each other
  [3.8, (i) => (i % 2 ? [-1, 0] : [1, 0])], // pairs look at each other
  [5.2, () => [-0.75, 0.6]], // all look down-left at "Dobry?"
  [6.8, () => [0, 0]], // back to the audience
]

/** look-around target of face i, u seconds into the idle loop (each face a touch late) */
function idleTarget(i: number, u: number): [number, number] {
  const v = (u % LOOP) - i * 0.06
  let target: [number, number] = [0, 0]
  for (const [at, look] of LOOKS) if (v >= at + rand(i * 11 + Math.round(at * 10)) * 0.08) target = look(i)
  return target
}

export function lookRig(root: HTMLElement, prefix: string): Rig {
  const $ = layerFinder(root, prefix)
  const feats = FACES.map((f) => $(`${f} features`))
  const rest = () => feats.forEach((g) => g?.removeAttribute('transform'))

  return {
    rest,
    play: () => {
      const svg = root.querySelector('svg')
      let cursor: { x: number; y: number } | null = null
      let movedAt = -Infinity // performance.now() of the last cursor move
      const onMove = (e: PointerEvent) => {
        const p = toSlidePoint(svg, e)
        if (!p) return
        cursor = { x: p.x, y: p.y }
        movedAt = performance.now()
      }
      const onLeave = () => { movedAt = -Infinity }
      window.addEventListener('pointermove', onMove)
      document.addEventListener('pointerleave', onLeave)

      // per face: position and velocity of the features (units of R), driven by a spring
      const state = FACES.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }))
      let last = 0
      let idleFrom = 0
      const w = 2 * Math.PI * FREQ
      const stop = runTimeline((t) => {
        const dt = Math.min(0.05, Math.max(0, t - last))
        last = t
        const idle = cursor === null || (performance.now() - movedAt) / 1000 > IDLE
        if (!idle) idleFrom = t
        feats.forEach((g, i) => {
          let tx: number, ty: number
          if (!idle && cursor) {
            const dx = cursor.x - CENTERS[i].x, dy = cursor.y - CENTERS[i].y
            const d = Math.hypot(dx, dy) || 1
            const k = Math.min(1, d / FOLLOW_FAR)
            tx = (dx / d) * k
            ty = (dy / d) * k
          } else {
            ;[tx, ty] = idleTarget(i, t - idleFrom)
          }
          // eye-like spring toward the target, a touch different per face
          const s = state[i]
          const wi = w * (0.92 + 0.16 * rand(i + 3))
          s.vx += (wi * wi * (tx - s.x) - 2 * DAMP * wi * s.vx) * dt
          s.vy += (wi * wi * (ty - s.y) - 2 * DAMP * wi * s.vy) * dt
          s.x += s.vx * dt
          s.y += s.vy * dt
          // faint drift so the faces never freeze
          const x = (s.x + 0.04 * Math.sin(t * 1.3 + i * 1.7)) * R
          const y = (s.y + 0.04 * Math.cos(t * 1.1 + i * 2.3)) * R
          g?.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`)
        })
      }, rest)
      return () => {
        stop()
        window.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerleave', onLeave)
        rest()
      }
    },
  }
}
