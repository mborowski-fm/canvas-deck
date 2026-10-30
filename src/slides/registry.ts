import type { ComponentType } from 'react'
import { GAP, SLIDE_H, SLIDE_W, type Slide, type SlideMeta } from './types'

// Every folder in src/slides/<NN-name>/ with a slide.tsx is a slide.
// Order = folder name order. notes.md is optional.
const mods = import.meta.glob<{ default: ComponentType; meta?: SlideMeta }>(
  './*/slide.tsx',
  { eager: true },
)
const notes = import.meta.glob<string>('./*/notes.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export const slides: Slide[] = Object.keys(mods)
  .sort()
  .map((path, index) => {
    const folder = path.split('/')[1]
    const { default: Component, meta = {} } = mods[path]
    const width = meta.width ?? SLIDE_W
    const height = meta.height ?? SLIDE_H
    return {
      id: folder,
      index,
      title: meta.title ?? folder.replace(/^\d+-/, '').replace(/-/g, ' '),
      Component,
      notes: notes[`./${folder}/notes.md`] ?? '',
      x: meta.x ?? index * (SLIDE_W + GAP),
      y: meta.y ?? 0,
      width,
      height,
    }
  })
