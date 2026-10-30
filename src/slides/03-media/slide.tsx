import type { SlideMeta } from '../types'
import logo from './logo.svg'

export const meta: SlideMeta = { title: 'Media' }

// Images: import from the slide folder. Video: <video src={importedMp4} autoPlay loop muted />
export default function Media() {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 80, background: '#fff' }}>
      <img src={logo} width={500} height={500} alt="logo" />
      <div style={{ fontSize: 64, maxWidth: 800 }}>
        <b>Images, video, code.</b>
        <p style={{ fontSize: 40, color: '#555' }}>Drop files into the slide folder and import them.</p>
      </div>
    </div>
  )
}
