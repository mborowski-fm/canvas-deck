/**
 * Emocje, ton, tempo (loop): two balls drop from the top outline onto the dashed floor.
 * Pink is bouncy: stretches while falling, squashes on every impact (the design shows the
 * squash) and bounces several times. Black is calm and heavy: no squash, a tiny settle and a
 * thud that knocks the floor line. Same gravity for both: the difference is the material.
 * Then both balls glide back up to the top outline and drop again. Rest pose = the Figma design.
 */
import { around, clamp01, layerFinder, makeRig, wobble } from '../motion'

const smooth = (u: number) => u * u * (3 - 2 * u)

const G = 2400 // px/s²
const FALL = 296 // px from the top outline to the floor
const LOOP = 5
const RISE = [3.7, 4.7] // both balls glide back up to the start
const PINK = { x: 704, floor: 952, start: 0.5, bounce: 0.62, squashedH: 190, size: 280 }
const BLACK = { start: 1.1, bounce: 0.12 }

/** height above the floor and speed for a dropped ball with restitution e; impacts listed */
function drop(t: number, e: number) {
  const t0 = Math.sqrt((2 * FALL) / G)
  if (t < 0) return { h: FALL, v: 0, impacts: [] as { at: number; speed: number }[] }
  const impacts = [{ at: t0, speed: G * t0 }]
  if (t < t0) return { h: FALL - (G * t * t) / 2, v: G * t, impacts }
  let at = t0
  let v = G * t0 * e
  while (v > 40) {
    const flight = (2 * v) / G
    if (t < at + flight) {
      const u = t - at
      return { h: v * u - (G * u * u) / 2, v: Math.abs(v - G * u), impacts }
    }
    at += flight
    impacts.push({ at, speed: v })
    v *= e
  }
  return { h: 0, v: 0, impacts }
}

export function ballsRig(root: HTMLElement, prefix: string) {
  const $ = layerFinder(root, prefix)
  const pink = $('Rectangle 99')
  const black = $('Rectangle 102')
  const floor = $('Line 6')
  const vMax = Math.sqrt(2 * G * FALL)
  // after the drop both balls glide back up to the start (ease in and out)
  const lift = (t: number) => FALL * smooth(clamp01((t - RISE[0]) / (RISE[1] - RISE[0])))

  return makeRig(
    (t) => {
      if (t === null) {
        ;[pink, black, floor].forEach((e) => { e?.removeAttribute('transform'); e?.removeAttribute('opacity') })
        return
      }
      // pink: squash on impact (short pulse), stretch with speed in the air
      const p = drop(t - PINK.start, PINK.bounce)
      if (t >= RISE[0]) p.h = lift(t)
      let squash = 0
      for (const im of p.impacts) squash = Math.max(squash, (im.speed / vMax) * Math.exp(-(((t - PINK.start - im.at) / 0.04) ** 2)))
      const stretch = (p.v / vMax) * 0.14 * (1 - squash)
      const sy = (1 - 0.32 * squash + stretch) * (PINK.size / PINK.squashedH)
      const sx = 1 + 0.22 * squash - stretch * 0.5
      pink?.setAttribute('transform', `translate(0 ${(-p.h).toFixed(2)}) ${around(PINK.x, PINK.floor, `scale(${sx.toFixed(4)} ${sy.toFixed(4)})`)}`)
      // black: heavy, no squash
      const b = drop(t - BLACK.start, BLACK.bounce)
      if (t >= RISE[0]) b.h = lift(t)
      black?.setAttribute('transform', `translate(0 ${(-b.h).toFixed(2)})`)
      // the heavy landing knocks the floor line
      const thud = b.impacts.length ? wobble(t - BLACK.start - b.impacts[0].at, 3, 11, 14) : 0
      floor?.setAttribute('transform', `translate(0 ${thud.toFixed(2)})`)
    },
    { loop: LOOP },
  )
}
