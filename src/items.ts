import saved from './slides/items.json'

/**
 * Free elements on the canvas next to the slides (not part of the slide order):
 * images, videos, video embeds (YouTube/Vimeo) and web pages. Added in edit mode, local to
 * each presenter (not synced), saved with "Save layout" (dev) to src/slides/items.json.
 * Local files (dev only) are uploaded to public/media/ and referenced as "media/<file>".
 */
export type ItemKind = 'image' | 'video' | 'embed' | 'web'
export type CanvasItem = { id: string; kind: ItemKind; src: string; x: number; y: number; width: number; height: number }

export const baseItems = saved as CanvasItem[]

const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i
const VIDEO = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i

export function kindOf(src: string): ItemKind {
  if (IMAGE.test(src)) return 'image'
  if (VIDEO.test(src)) return 'video'
  if (embedUrl(src)) return 'embed'
  return 'web'
}

/** Like kindOf, but links without a file extension are tried as an image first (CDNs, image services). */
export async function detectKind(src: string): Promise<ItemKind> {
  const k = kindOf(src)
  if (k !== 'web') return k
  const isImage = await new Promise<boolean>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img.naturalWidth > 0)
    img.onerror = () => resolve(false)
    img.src = src
    setTimeout(() => resolve(false), 3000)
  })
  return isImage ? 'image' : 'web'
}

/** YouTube / Vimeo links -> their embeddable player URL (null for anything else). */
export function embedUrl(src: string) {
  const yt = src.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`
  const vimeo = src.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

export const DEFAULT_SIZE: Record<ItemKind, { width: number; height: number }> = {
  image: { width: 960, height: 640 },
  video: { width: 1280, height: 720 },
  embed: { width: 1280, height: 720 },
  web: { width: 1280, height: 800 },
}

export const newItemId = () => 'item-' + Math.random().toString(36).slice(2, 9)

/** Short label for the frame title. */
export function itemLabel(it: CanvasItem) {
  try {
    const u = new URL(it.src, location.href)
    return u.origin === location.origin ? u.pathname.split('/').pop() || it.src : u.hostname.replace(/^www\./, '')
  } catch {
    return it.src
  }
}

/** Natural size of an image or video, scaled to fit `max` px on its longer side. */
export function mediaSize(kind: ItemKind, src: string, max = 1280): Promise<{ width: number; height: number }> {
  const fit = (w: number, h: number) => {
    const k = Math.min(1, max / Math.max(w, h))
    return { width: Math.round(w * k), height: Math.round(h * k) }
  }
  return new Promise((resolve) => {
    const fallback = () => resolve(DEFAULT_SIZE[kind])
    if (kind === 'image') {
      const img = new Image()
      img.onload = () => (img.naturalWidth ? resolve(fit(img.naturalWidth, img.naturalHeight)) : fallback())
      img.onerror = fallback
      img.src = src
    } else if (kind === 'video') {
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => (v.videoWidth ? resolve(fit(v.videoWidth, v.videoHeight)) : fallback())
      v.onerror = fallback
      v.src = src
    } else fallback()
    setTimeout(fallback, 4000)
  })
}
