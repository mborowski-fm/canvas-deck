import { useMemo } from 'react'

/**
 * Renders a Figma SVG export inline (not <img>), so it stays vector-sharp at
 * any canvas zoom and every layer is reachable from code for animation:
 * Figma layer names become ids, prefixed with the slide id, e.g.
 * `#percepcja__Ellipse 8` -> query with `[id="percepcja__Ellipse 8"]`.
 */
export function SvgSlide({ id, svg }: { id: string; svg: string }) {
  const html = useMemo(() => scopeIds(svg, id), [svg, id])
  return <div className="svg-slide" data-svg-slide={id} dangerouslySetInnerHTML={{ __html: html }} />
}

// Several SVGs live in one document, so mask/clip/gradient ids must be unique.
function scopeIds(svg: string, prefix: string) {
  return svg
    .replace(/\sid="([^"]+)"/g, (_, v) => ` id="${prefix}__${v}"`)
    .replace(/url\(#([^)]+)\)/g, (_, v) => `url(#${prefix}__${v})`)
    .replace(/href="#([^"]+)"/g, (_, v) => `href="#${prefix}__${v}"`)
}
