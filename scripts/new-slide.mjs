// npm run new-slide -- my-slide-name   -> creates src/slides/<next-number>-my-slide-name/
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'

const name = process.argv[2]
if (!name) { console.error('Usage: npm run new-slide -- <kebab-name>'); process.exit(1) }
const dir = 'src/slides'
const n = readdirSync(dir).filter((f) => /^\d+-/.test(f)).length + 1
const folder = `${dir}/${String(n).padStart(2, '0')}-${name}`
mkdirSync(folder)
writeFileSync(`${folder}/slide.tsx`, `import type { SlideMeta } from '../types'

export const meta: SlideMeta = { title: '${name.replace(/-/g, ' ')}' }

export default function Slide() {
  return <div style={{ height: '100%', display: 'grid', placeItems: 'center', fontSize: 96 }}>${name}</div>
}
`)
writeFileSync(`${folder}/notes.md`, `# ${name}\n- \n`)
console.log('Created', folder)
