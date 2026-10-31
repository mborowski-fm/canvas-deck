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
