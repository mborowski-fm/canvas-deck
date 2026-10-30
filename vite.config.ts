import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const SLIDES = resolve(__dirname, 'src/slides')
const MEDIA = resolve(__dirname, 'public/media')

/**
 * Dev only, so edits made in the browser land in the repo:
 * - POST /__deck/save { layout: {slideId: {x,y}}, items: CanvasItem[] } writes src/slides/layout.json and items.json
 * - POST /__deck/upload?name=<file> (raw body) writes public/media/<time>-<name>, returns { src: "media/..." } Our own writes skip HMR, so the open deck is not reloaded.
 */
function deckSave(): Plugin {
  const own = new Set<string>()
  const write = (file: string, text: string) => {
    own.add(file)
    writeFileSync(file, text)
  }
  return {
    name: 'deck-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__deck/upload', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end()
        }
        const name = new URL(req.url ?? '', 'http://x').searchParams.get('name') ?? 'file'
        const safe = `${Date.now()}-${name.replace(/[^\w.-]+/g, '-').slice(-80)}`
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        mkdirSync(MEDIA, { recursive: true })
        writeFileSync(resolve(MEDIA, safe), Buffer.concat(chunks))
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ src: `media/${safe}` }))
      })
      server.middlewares.use('/__deck/save', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end()
        }
        let body = ''
        for await (const chunk of req) body += chunk
        const { layout, items } = JSON.parse(body) as { layout?: Record<string, { x: number; y: number }>; items?: unknown[] }
        if (layout) write(resolve(SLIDES, 'layout.json'), JSON.stringify(layout, null, 2) + '\n')
        if (items) write(resolve(SLIDES, 'items.json'), JSON.stringify(items, null, 2) + '\n')
        res.end('ok')
      })
    },
    handleHotUpdate({ file }) {
      if (own.delete(file)) return []
    },
  }
}

// Shown in the bottom-left corner, so you can tell which build you are looking at.
const git = (cmd: string) => { try { return execSync(cmd).toString().trim() } catch { return '' } }
const BUILD = {
  version: JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')).version as string,
  sha: (process.env.GITHUB_SHA ?? git('git rev-parse HEAD')).slice(0, 7),
  time: new Date().toISOString(),
}

// base './' lets the build run from any GitHub Pages sub-path
export default defineConfig({
  base: './',
  plugins: [react(), deckSave()],
  define: { __BUILD__: JSON.stringify(BUILD) },
})
