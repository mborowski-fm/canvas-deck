import type { SlideMeta } from '../types'

export const meta: SlideMeta = { title: 'Animated SVG' }

// A slide is any React component. Here: SVG animated with SMIL + CSS.
export default function AnimatedSvg() {
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: '#f4f1ea' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }
        .orbit { transform-origin: 400px 300px; animation: spin 8s linear infinite; }`}</style>
      <svg width="1200" height="800" viewBox="0 0 800 600">
        <circle cx="400" cy="300" r="60" fill="#111" />
        <circle cx="400" cy="300" r="180" fill="none" stroke="#bbb" strokeDasharray="6 8" />
        <g className="orbit">
          <circle cx="580" cy="300" r="26" fill="#e5484d" />
        </g>
        <circle cx="400" cy="300" r="60" fill="none" stroke="#0091ff" strokeWidth="4">
          <animate attributeName="r" values="60;110;60" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0;1" dur="3s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  )
}
