/**
 * Hej UI! (loop): the faces stay in place, but their features (eyes + mouth) look around at each
 * other, like a group reacting to "Dobry?". Each look is a quick, eye-like saccade: a spring with
 * a small overshoot that settles (same feel as the eye on slide 02), slightly staggered between
 * faces so they read as individuals. A faint drift keeps them alive between looks.
 * The features are cut out of the face masks in slide.svg and drawn on top in the background
 * color ("<face> features"), so they can move inside the patterned disc.
 * Rest pose = the Figma design.
 */
import { layerFinder, makeRig, rand, spring } from '../motion'

const FACES = ['mood_bad', 'sentiment_neutral', 'mood', 'sentiment_very_dissatisfied', 'sentiment_stressed']
const R = 34 // px: how far the features move when a face looks fully to one side
const SACCADE = [3.0, 0.6] as const
const LOOP = 9

type Look = (i: number) => [number, number] // where face i looks, in units of R
const toward = (j: number): Look => (i) => (i === j ? [0, 0.15] : [Math.sign(j - i), 0.1])
const LOOKS: [number, Look][] = [
  [0.8, toward(2)], // everyone looks at the happy face in the middle
  [2.0, (i) => (i === 2 ? [-1, 0] : toward(2)(i))], // the middle one glances left...
  [2.8, (i) => (i === 2 ? [1, 0] : i < 2 ? [1, -0.2] : [-1, -0.2])], // ...then right; the others peek at each other
  [4.2, (i) => (i % 2 ? [-1, 0] : [1, 0])], // pairs look at each other
  [5.6, () => [-0.75, 0.6]], // all look down-left at "Dobry?"
  [7.2, () => [0, 0]], // back to the audience
]

/** gaze of face i at time t: one spring per look, starting a little later for each face */
function gaze(i: number, t: number) {
  let x = 0, y = 0
  let prev: [number, number] = [0, 0]
  for (const [at, look] of LOOKS) {
    const target = look(i)
    const s = spring(t - at - i * 0.06 - rand(i * 11 + Math.round(at * 10)) * 0.08, ...SACCADE)
    x += (target[0] - prev[0]) * s
    y += (target[1] - prev[1]) * s
    prev = target
  }
  // faint drift so the faces never freeze
  x += 0.04 * Math.sin(t * 1.3 + i * 1.7)
  y += 0.04 * Math.cos(t * 1.1 + i * 2.3)
  return [x * R, y * R]
}

export function lookRig(root: HTMLElement, prefix: string) {
  const $ = layerFinder(root, prefix)
  const feats = FACES.map((f) => $(`${f} features`))
  return makeRig(
    (t) =>
      feats.forEach((g, i) => {
        if (t === null) return g?.removeAttribute('transform')
        const [dx, dy] = gaze(i, t)
        g?.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`)
      }),
    { loop: LOOP },
  )
}
