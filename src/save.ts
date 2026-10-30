import type { CanvasItem } from './items'

/**
 * Dev only: `npm run dev` writes straight into the repo through the deck-save plugin in
 * vite.config.ts (layout.json, items.json, uploaded media). The deployed site has no server.
 */
export const canSave = import.meta.env.DEV

export async function saveLayoutToRepo(layout: Record<string, { x: number; y: number }>, items: CanvasItem[]) {
  if (!canSave) return false
  const r = await fetch('/__deck/save', { method: 'POST', body: JSON.stringify({ layout, items }) })
  return r.ok
}

/** Upload a local file to public/media/; returns its path relative to the page ("media/<file>"). */
export async function uploadMedia(file: File) {
  if (!canSave) throw new Error('Uploads work only in npm run dev')
  const r = await fetch(`/__deck/upload?name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file })
  if (!r.ok) throw new Error(`Upload failed (${r.status})`)
  return ((await r.json()) as { src: string }).src
}
