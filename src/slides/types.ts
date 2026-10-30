import type { ComponentType } from 'react'

/** Artboard size in world px. Every slide is 1920x1080 unless meta overrides it. */
export const SLIDE_W = 1920
export const SLIDE_H = 1080
const GAP = 240

export interface SlideMeta {
  title?: string
  /** World position. Default: laid out in a row by folder order. */
  x?: number
  y?: number
  width?: number
  height?: number
  /**
   * Animations of this slide. They run only on the active slide and are synced for everyone.
   * One entry: plays when the slide becomes active (or loops, `loop: true`); replay restarts it.
   * Several entries: small 1, 2, 3 buttons in the slide's bottom-left corner play each one.
   * Descriptions are appended to the speaker notes automatically.
   */
  animations?: SlideAnimation[]
}

export interface SlideAnimation {
  description: string
  /** idle animation that repeats while the slide is active */
  loop?: boolean
}

/** What a slide component gets. `play` is null when the slide is not active: render the rest pose. */
export interface SlideProps {
  play: { anim: number; key: string } | null
}

export interface Slide {
  id: string
  index: number
  title: string
  Component: ComponentType<SlideProps>
  animations: SlideAnimation[]
  notes: string
  x: number
  y: number
  width: number
  height: number
}

export { GAP }
