/**
 * Dev only: `npm run dev` writes the layout straight into the repo through the deck-save
 * plugin in vite.config.ts. The deployed site has no server, so layout edits there stay in the room.
 */
export const canSave = import.meta.env.DEV

export async function saveLayoutToRepo(layout: Record<string, { x: number; y: number }>) {
  if (!canSave) return false
  const r = await fetch('/__deck/save', { method: 'POST', body: JSON.stringify({ layout }) })
  return r.ok
}
