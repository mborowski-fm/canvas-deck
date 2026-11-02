/**
 * Motion helpers for slide animations. Everything is a pure function of time (seconds),
 * so an animation is the same frame for every presenter and can be replayed from t = 0.
 */

/**
 * Step response of a damped spring going 0 -> 1, started at t = 0.
 * freq: oscillations per second (higher = snappier), damping: 0..1 (lower = more overshoot).
 */
export function spring(t: number, freq = 2, damping = 0.6) {
  if (t <= 0) return 0
  const w = 2 * Math.PI * freq
  const z = Math.min(damping, 0.999)
  const wd = w * Math.sqrt(1 - z * z)
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
}

/**
 * Material 3 Expressive motion: everything moves on springs. Presets as [freq Hz, damping ratio]
 * for `spring()` (freq = sqrt(stiffness) / 2π). Spatial = position, size, rotation (may bounce);
 * effects = opacity and color (no bounce). `bouncy` is the "bubble" feel of the eye on slide 02.
 */
export const M3 = {
  fast: [4.5, 0.6], // spatial fast: stiffness 800, damping 0.6
  default: [3.1, 0.8], // spatial default: stiffness 380, damping 0.8
  slow: [2.25, 0.8], // spatial slow: stiffness 200, damping 0.8
  bouncy: [2.2, 0.58], // soft and bubbly: clear overshoot, gentle settle
  lazy: [1.2, 0.62], // big, slow travels that still bounce a little
  effects: [3.1, 1], // opacity / color: no bounce
} as const

/** Speed of a spring (progress per second), for squash and stretch. */
export function springVel(t: number, freq = 2, damping = 0.6) {
  const h = 0.004
  return (spring(t + h, freq, damping) - spring(t - h, freq, damping)) / (2 * h)
}

/** Squash and stretch from speed: longer along the motion, thinner across, about the same volume. */
export function stretchBy(speed: number, k = 0.00025, max = 0.14) {
  const s = Math.min(max, Math.abs(speed) * k)
  return { along: 1 + s, across: 1 / (1 + s) }
}

/** Decaying wobble around 0 that starts at t = 0 (e.g. a knock). */
export function wobble(t: number, amp: number, freq = 4, decay = 6) {
  if (t <= 0) return 0
  return amp * Math.exp(-decay * t) * Math.sin(2 * Math.PI * freq * t)
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
export const easeInQuad = (u: number) => u * u
export const easeOutCubic = (u: number) => 1 - (1 - u) ** 3

/** Frame loop for a play; `frame(t)` returns false to stop. Respects reduced motion. Returns stop. */
export function runTimeline(frame: (t: number) => boolean | void, rest: () => void) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    rest()
    return () => {}
  }
  const start = performance.now()
  let raf = requestAnimationFrame(function tick(now) {
    raf = frame((now - start) / 1000) === false ? 0 : requestAnimationFrame(tick)
  })
  return () => cancelAnimationFrame(raf)
}

/** What an animated slide drives: `rest` = the Figma design, `play` starts and returns stop. */
export type Rig = { rest: () => void; play: () => () => void }

/**
 * Rig from a pose function of time (null = rest pose). `loop`: seconds per cycle.
 * `end`: one-shot length; after it the last frame stays.
 */
export function makeRig(pose: (t: number | null) => void, opts: { loop?: number; end?: number } = {}): Rig {
  return {
    rest: () => pose(null),
    play: () => {
      const stop = runTimeline((t) => {
        pose(opts.loop ? t % opts.loop : opts.end != null ? Math.min(t, opts.end) : t)
        return opts.end == null || t < opts.end
      }, () => pose(null))
      return () => {
        stop()
        pose(null)
      }
    },
  }
}

/** Find a Figma layer by name inside a slide (ids are prefixed by SvgSlide). */
export const layerFinder = (root: HTMLElement, prefix: string) => (id: string) =>
  root.querySelector<SVGGraphicsElement>(`[id="${prefix}__${CSS.escape(id)}"]`)

/** Deterministic pseudo-random number in [0, 1) for an integer seed (same on every screen). */
export function rand(seed: number) {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Transform that scales/rotates around a point. */
export const around = (cx: number, cy: number, inner: string) => `translate(${cx} ${cy}) ${inner} translate(${-cx} ${-cy})`
