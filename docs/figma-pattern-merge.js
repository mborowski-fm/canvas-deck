// Figma use_figma script: copy slide frames to the page "Canvas Deck export" and merge every
// "Pattern tiles" group into one shape per color, so the exported SVG has no tile seams.
// Layer i = union of the visible regions of colors i..n: lower colors run underneath the
// colors above them, so no two shape edges coincide (no anti-aliasing hairlines).
// Usage: set FRAME_IDS (original frames in section 139:359) and run with the use_figma tool.
// Heavy frames (hundreds of shapes, e.g. "Oceń kadr") may time out: copy first, then merge one
// "Pattern tiles" frame per call.
const FRAME_IDS = ['115:2207']
const PAGE_NAME = 'Canvas Deck export'

let page = figma.root.children.find((p) => p.name === PAGE_NAME)
if (!page) { page = figma.createPage(); page.name = PAGE_NAME }
await figma.setCurrentPageAsync(page) // booleans must run on the current page
for (const n of [...page.children]) if (n.name === 'tmp' || FRAME_IDS.some((id) => n.name.includes('[export ' + id + ']'))) n.remove()

const inv = (m) => { const [[a, b, tx], [c, d, ty]] = m; const det = a * d - b * c; return [[d / det, -b / det, (b * ty - d * tx) / det], [-c / det, a / det, (c * tx - a * ty) / det]] }
const mul = (m, n) => [[m[0][0] * n[0][0] + m[0][1] * n[1][0], m[0][0] * n[0][1] + m[0][1] * n[1][1], m[0][0] * n[0][2] + m[0][1] * n[1][2] + m[0][2]], [m[1][0] * n[0][0] + m[1][1] * n[1][0], m[1][0] * n[0][1] + m[1][1] * n[1][1], m[1][0] * n[0][2] + m[1][1] * n[1][2] + m[1][2]]]
const relTo = (abs, parent) => mul(inv(parent.absoluteTransform), abs)
const solid = (paints) => { const v = (paints || []).filter((p) => p.visible !== false); if (v.length !== 1 || v[0].type !== 'SOLID') return null; return v[0] }
const key = (p) => [p.color.r, p.color.g, p.color.b, p.opacity ?? 1].map((x) => x.toFixed(4)).join(',')
const BLACK = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]
const area = (n) => n.width * n.height

function mergePattern(T) {
  const P = T.parent
  // scratch frame at page level (booleans inside masked groups fail to flatten)
  const W = figma.createFrame(); W.name = 'tmp'; W.fills = []; W.clipsContent = false; page.appendChild(W)
  W.resize(T.width, T.height); W.relativeTransform = T.absoluteTransform
  // clone() lands on the page, not next to the original: keep copies inside W
  const dup = (n) => { const c = n.clone(); W.appendChild(c); c.relativeTransform = n.relativeTransform; return c }
  const rectIn = (node, paint) => { const r = figma.createRectangle(); W.appendChild(r); r.resize(node.width, node.height); r.relativeTransform = relTo(node.absoluteTransform, W); r.fills = paint ? [paint] : BLACK; return r }
  // empty results (fully covered / outside the clip) cannot be flattened: treat as nothing
  const flat = (n) => { try { const v = figma.flatten([n], W); return v.vectorPaths.length ? v : (v.remove(), null) } catch (e) { if (!n.removed) n.remove(); return null } }
  try {
    const items = [] // [shape, paint] in paint order, each clipped to its tile
    const base = solid(T.fills); if (base) items.push([rectIn(T, base), base])
    for (const C of T.children) {
      if (C.visible === false) continue
      const isTile = C.type === 'FRAME'
      if (isTile) { const cb = solid(C.fills); if (cb) items.push([rectIn(C, cb), cb]) }
      const clipNode = isTile ? C : T
      const leaves = isTile ? C.findAll((n) => n.type !== 'FRAME' && n.type !== 'GROUP' && 'fills' in n && !(n.parent && n.parent.type === 'BOOLEAN_OPERATION')) : [C]
      const runs = [] // consecutive shapes of one color are merged in one union
      for (const v of leaves) {
        if (v.visible === false) continue
        const parts = []
        const fill = solid(v.fills)
        if (fill) { const c = v.clone(); W.appendChild(c); c.relativeTransform = relTo(v.absoluteTransform, W); if ('strokes' in c) c.strokes = []; parts.push([c, fill]) }
        const stroke = 'strokes' in v ? solid(v.strokes) : null
        if (stroke && v.strokeWeight) { const o = v.outlineStroke(); if (o) { W.appendChild(o); o.relativeTransform = relTo(v.absoluteTransform, W); parts.push([o, stroke]) } }
        for (const [n, p] of parts) {
          const last = runs[runs.length - 1]
          if (last && key(last.paint) === key(p)) last.nodes.push(n); else runs.push({ paint: p, nodes: [n] })
        }
      }
      for (const run of runs) {
        const shape = run.nodes.length > 1 ? figma.union(run.nodes, W) : run.nodes[0]
        const piece = flat(figma.intersect([shape, rectIn(clipNode, null)], W))
        if (piece) items.push([piece, run.paint])
      }
    }
    // visible region per color: each shape cuts the colors painted before it
    const R = new Map(); const paints = new Map()
    for (const [S, paint] of items) {
      const k = key(paint); paints.set(k, paint)
      for (const [d, Rd] of [...R]) {
        if (d === k) continue
        const cut = flat(figma.subtract([Rd, dup(S)], W))
        if (cut) R.set(d, cut); else R.delete(d)
      }
      const merged = R.has(k) ? flat(figma.union([R.get(k), S], W)) : S
      if (merged) R.set(k, merged)
    }
    // bottom = biggest region; layer i = union of regions i..n
    const order = [...R.entries()].sort((a, b) => area(b[1]) - area(a[1]))
    const layers = []; let above = null
    for (let i = order.length - 1; i >= 0; i--) {
      const [k, region] = order[i]
      const shape = above ? flat(figma.union([region, dup(above)], W)) : region
      shape.fills = [paints.get(k)]; shape.strokes = []; shape.name = 'Color ' + (i + 1)
      layers.unshift(shape); above = shape
    }
    const g = figma.group(layers, P, P.children.indexOf(T))
    layers.forEach((l, i) => g.insertChild(i, l)) // Color 1 at the bottom
    g.name = 'Pattern tiles'
    T.remove()
    return layers.length
  } finally { W.remove() }
}

const out = []
for (const id of FRAME_IDS) {
  const src = await figma.getNodeByIdAsync(id)
  const f = src.clone(); page.appendChild(f)
  f.x = src.absoluteTransform[0][2]; f.y = src.absoluteTransform[1][2]
  f.name = src.name + ' [export ' + id + ']'
  const res = []
  for (const T of f.findAll((n) => n.name === 'Pattern tiles' && n.type === 'FRAME')) { try { res.push(mergePattern(T)) } catch (e) { res.push('skip: ' + e.message) } }
  out.push([id, f.id, res.join(',')])
}
return out
