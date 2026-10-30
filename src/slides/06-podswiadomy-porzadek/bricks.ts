/**
 * Podświadomy porządek, looping while the slide is active:
 * Bricks are hard and heavy: short, quick moves, stiff springs with almost no overshoot,
 * no floating or wobble, and a short hard knock on impact.
 * 1. Knock out, as a chain reaction: the wall starts neat. The bottom brick braces and is pushed
 *    out of its slot. It hits the brick above, which only then starts to move, kicked into motion
 *    (no brace, it starts fast) while the one below recoils a little; that one hits the next, and
 *    so on up to the orange brick, shoved up last. Neighbors in each row take a hard knock.
 * 2. Hold: the bricks stay still where they landed.
 * 3. Rebuild: top first, the bricks slide back into their slots with a thud.
 * 4. A short neat pause, then again.
 * Rest pose (slide not active) = the Figma layout.
 */
import { clamp01, runTimeline, spring, wobble } from '../motion'

type Brick = {
  id: string // Figma layer (prefixed by SvgSlide)
  final: { x: number; y: number; angle: number } // center + rotation in the Figma design
  home: { x: number; y: number } // center of its slot in the wall
  pushedBy: number | null // index of the brick that hits this one (null = the first mover)
  neighbors: string[] // grey bricks in the same row that feel the knock
}

// Bricks are 224x84; wall rows at y 424/572/720/868, columns every 288 px.
const BRICKS: Brick[] = [
  { id: 'Pattern / brick_2', final: { x: 1104, y: 886, angle: 15 }, home: { x: 1104, y: 910 }, pushedBy: null, neighbors: ['brick_7', 'brick_15'] }, // bottom
  { id: 'Pattern / brick_3', final: { x: 976, y: 722, angle: 15 }, home: { x: 976, y: 762 }, pushedBy: 0, neighbors: ['brick_8', 'brick_16'] },
  { id: 'Pattern / brick_4', final: { x: 1104, y: 630, angle: 15 }, home: { x: 1104, y: 614 }, pushedBy: 1, neighbors: ['brick_18'] },
  { id: 'Pattern / brick', final: { x: 848, y: 558, angle: -15 }, home: { x: 816, y: 614 }, pushedBy: 1, neighbors: ['brick_6'] },
  { id: 'brick_10', final: { x: 976, y: 400, angle: 0 }, home: { x: 976, y: 466 }, pushedBy: 2, neighbors: ['brick_9', 'brick_17'] }, // top
]
const FIRST = 0.75 // the bottom brick starts moving
const CONTACT = 0.13 // a moving brick reaches the one above this long after it starts
// when each brick starts: the moment the brick below hits it (the left one in row B a hair later)
const START = BRICKS.reduce<number[]>((acc, b, i) => {
  acc.push(b.pushedBy === null ? FIRST : acc[b.pushedBy] + CONTACT + (i === 3 ? 0.03 : 0))
  return acc
}, [])
const ANTICIPATION = 0.1 // brief brace before the push
const LIFT = 10 // px: a heavy brick barely leaves the ground
const LIFT_TIME = 0.22
const KICK = 9 // 1/s: a hit brick starts at full speed and slows into place (no overshoot)
const REBUILD = 4.6 // first brick (the top one) starts going home; until then everything holds still
const REBUILD_STAGGER = 0.12
const LAND = 0.26 // a returning brick reaches its slot about this long after it starts
const LOOP = 7 // seconds per cycle
// stiff springs: fast, almost no overshoot
const PUSH = { freq: 2.6, damping: 0.86 }
const TIP = { freq: 2.4, damping: 0.9 }
const HOME = { freq: 2.6, damping: 0.92 }

/** knocked out of the wall: home -> Figma pose */
function knock(b: Brick, i: number, t: number) {
  const u = t - START[i]
  const first = b.pushedBy === null
  if (u < (first ? -ANTICIPATION : 0)) return { x: b.home.x, y: b.home.y, deg: -b.final.angle }
  if (u < 0) {
    // anticipation: settle down a hair and lean against the push
    const a = Math.sin(((u + ANTICIPATION) / ANTICIPATION) * Math.PI * 0.5)
    return { x: b.home.x, y: b.home.y + a * 2, deg: -b.final.angle - a * 0.8 * Math.sign(b.final.angle || 1) }
  }
  // the first brick is pushed (spring from rest); the others are hit (start fast, ease out)
  const p = first ? spring(u, PUSH.freq, PUSH.damping) : 1 - Math.exp(-KICK * u)
  const r = first ? spring(u, TIP.freq, TIP.damping) : 1 - Math.exp(-KICK * 0.8 * u)
  const arc = Math.sin(clamp01(u / LIFT_TIME) * Math.PI) * LIFT
  return {
    x: b.home.x + (b.final.x - b.home.x) * p,
    y: b.home.y + (b.final.y - b.home.y) * p - arc,
    deg: -b.final.angle * (1 - r),
  }
}

export function bricksRig(root: HTMLElement, prefix: string) {
  const $ = (id: string) => root.querySelector<SVGGraphicsElement>(`[id="${prefix}__${id}"]`)
  const els = BRICKS.map((b) => $(b.id))
  const neighbors = BRICKS.map((b) => b.neighbors.map($))

  const pose = (t: number | null) =>
    BRICKS.forEach((b, i) => {
      const el = els[i]
      if (t === null) {
        el?.removeAttribute('transform')
        neighbors[i].forEach((n) => n?.removeAttribute('transform'))
        return
      }
      let { x, y, deg } = knock(b, i, t)
      // recoil: a brick jolts back a little when it hits the one above
      for (let k = 0; k < BRICKS.length; k++) if (BRICKS[k].pushedBy === i) y += wobble(t - START[k], 2, 9, 16)
      // rebuild in reverse order: the top brick goes home first
      const back = REBUILD + (BRICKS.length - 1 - i) * REBUILD_STAGGER
      const q = spring(t - back, HOME.freq, HOME.damping)
      if (t > back) {
        const arc = Math.sin(clamp01((t - back) / LAND) * Math.PI) * LIFT * 0.5
        x += (b.home.x - x) * q
        y += (b.home.y - y) * q - arc
        deg += (-b.final.angle - deg) * q
      }
      // the brick's path is drawn at its final pose: `deg` is the rotation relative to it (-angle = level)
      el?.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${deg.toFixed(2)}) translate(${-b.final.x} ${-b.final.y})`)
      // neighbors take a short hard knock when the brick is pushed out and when it lands back
      const jolt = wobble(t - START[i], -2.5, 9, 16) + wobble(t - back - LAND, 1.5, 9, 18)
      neighbors[i].forEach((n) => n?.setAttribute('transform', `translate(0 ${jolt.toFixed(2)})`))
    })

  return {
    rest: () => pose(null),
    play: () => {
      const stop = runTimeline((t) => pose(t % LOOP), () => pose(null))
      return () => {
        stop()
        pose(null)
      }
    },
  }
}
