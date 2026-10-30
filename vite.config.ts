import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const SLIDES = resolve(__dirname, 'src/slides')

/**
 * Dev only: POST /__deck/save { layout: {slideId: {x,y}} } writes src/slides/layout.json,
 * so a layout arranged in the browser lands in the repo. Our own writes skip HMR, so the open deck is not reloaded.
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
      server.middlewares.use('/__deck/save', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end()
        }
        let body = ''
        for await (const chunk of req) body += chunk
        const { layout } = JSON.parse(body) as { layout?: Record<string, { x: number; y: number }> }
        if (layout) write(resolve(SLIDES, 'layout.json'), JSON.stringify(layout, null, 2) + '\n')
        res.end('ok')
      })
    },
    handleHotUpdate({ file }) {
      if (own.delete(file)) return []
    },
  }
}

// base './' lets the build run from any GitHub Pages sub-path
export default defineConfig({
  base: './',
  plugins: [react(), deckSave()],
})
