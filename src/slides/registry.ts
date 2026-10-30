import type { ComponentType } from 'react'
import layout from './layout.json'
import { GAP, SLIDE_H, SLIDE_W, type Slide, type SlideAnimation, type SlideMeta, type SlideProps } from './types'

// Every folder in src/slides/<NN-name>/ with a slide.tsx is a slide.
// Order = folder name order. notes.md is optional.
const mods = import.meta.glob<{ default: ComponentType<SlideProps>; meta?: SlideMeta }>(
  './*/slide.tsx',
  { eager: true },
)
const notes = import.meta.glob<string>('./*/notes.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** Speaker notes = notes.md + an automatic section describing the slide's animations. */
function withAnimationNotes(text: string, anims: SlideAnimation[]) {
  if (!anims.length) return text
  const lines = anims.map((a, i) => `- ${anims.length > 1 ? `**${i + 1}:** ` : ''}${a.description}${a.loop ? ' (loops)' : ''}`)
  return `${text.trimEnd()}${text.trim() ? '\n\n' : ''}## Animation\n${lines.join('\n')}\n`
}

// Positions saved from edit mode ("Copy layout" button) win over meta.
const saved = layout as Record<string, { x: number; y: number }>

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
      animations: meta.animations ?? [],
      notes: withAnimationNotes(notes[`./${folder}/notes.md`] ?? '', meta.animations ?? []),
      x: saved[folder]?.x ?? meta.x ?? index * (SLIDE_W + GAP),
      y: saved[folder]?.y ?? meta.y ?? 0,
      width,
      height,
    }
  })
