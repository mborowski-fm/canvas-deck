import type { Slide } from '../slides/types'

export type AlignOp = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom' | 'disth' | 'distv'
export type Pos = { id: string; x: number; y: number }

/** Pure helper: new positions for the selected slides after an align/distribute. */
export function align(sel: Slide[], op: AlignOp): Pos[] {
  if (sel.length < 2) return []
  const minX = Math.min(...sel.map((s) => s.x))
  const maxX = Math.max(...sel.map((s) => s.x + s.width))
  const minY = Math.min(...sel.map((s) => s.y))
  const maxY = Math.max(...sel.map((s) => s.y + s.height))
  switch (op) {
    case 'left': return sel.map((s) => ({ id: s.id, x: minX, y: s.y }))
    case 'right': return sel.map((s) => ({ id: s.id, x: maxX - s.width, y: s.y }))
    case 'hcenter': return sel.map((s) => ({ id: s.id, x: (minX + maxX) / 2 - s.width / 2, y: s.y }))
    case 'top': return sel.map((s) => ({ id: s.id, x: s.x, y: minY }))
    case 'bottom': return sel.map((s) => ({ id: s.id, x: s.x, y: maxY - s.height }))
    case 'vcenter': return sel.map((s) => ({ id: s.id, x: s.x, y: (minY + maxY) / 2 - s.height / 2 }))
    case 'disth': {
      if (sel.length < 3) return []
      const o = [...sel].sort((a, b) => a.x - b.x)
      const gap = (maxX - minX - o.reduce((n, s) => n + s.width, 0)) / (o.length - 1)
      let x = minX
      return o.map((s) => { const r = { id: s.id, x, y: s.y }; x += s.width + gap; return r })
    }
    case 'distv': {
      if (sel.length < 3) return []
      const o = [...sel].sort((a, b) => a.y - b.y)
      const gap = (maxY - minY - o.reduce((n, s) => n + s.height, 0)) / (o.length - 1)
      let y = minY
      return o.map((s) => { const r = { id: s.id, x: s.x, y }; y += s.height + gap; return r })
    }
  }
}
