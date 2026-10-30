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
}

export interface Slide {
  id: string
  index: number
  title: string
  Component: ComponentType
  notes: string
  x: number
  y: number
  width: number
  height: number
}

export { GAP }
