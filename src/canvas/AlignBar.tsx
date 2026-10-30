import type { AlignOp } from './align'

const ICONS: Record<AlignOp, React.ReactNode> = {
  left: <><path d="M2 1.5v13" /><rect x="4.5" y="3.5" width="9" height="3.5" /><rect x="4.5" y="9" width="5.5" height="3.5" /></>,
  hcenter: <><path d="M8 1.5v13" /><rect x="3" y="3.5" width="10" height="3.5" /><rect x="5" y="9" width="6" height="3.5" /></>,
  right: <><path d="M14 1.5v13" /><rect x="2.5" y="3.5" width="9" height="3.5" /><rect x="6" y="9" width="5.5" height="3.5" /></>,
  top: <><path d="M1.5 2h13" /><rect x="3.5" y="4.5" width="3.5" height="9" /><rect x="9" y="4.5" width="3.5" height="5.5" /></>,
  vcenter: <><path d="M1.5 8h13" /><rect x="3.5" y="3" width="3.5" height="10" /><rect x="9" y="5" width="3.5" height="6" /></>,
  bottom: <><path d="M1.5 14h13" /><rect x="3.5" y="2.5" width="3.5" height="9" /><rect x="9" y="6" width="3.5" height="5.5" /></>,
  disth: <><path d="M2 1.5v13M14 1.5v13" /><rect x="6" y="4" width="4" height="8" /></>,
  distv: <><path d="M1.5 2h13M1.5 14h13" /><rect x="4" y="6" width="8" height="4" /></>,
}

const GROUPS: { op: AlignOp; label: string; min: number }[][] = [
  [
    { op: 'left', label: 'Align left', min: 2 },
    { op: 'hcenter', label: 'Align horizontal centers', min: 2 },
    { op: 'right', label: 'Align right', min: 2 },
  ],
  [
    { op: 'top', label: 'Align top', min: 2 },
    { op: 'vcenter', label: 'Align vertical centers', min: 2 },
    { op: 'bottom', label: 'Align bottom', min: 2 },
  ],
  [
    { op: 'disth', label: 'Distribute horizontal spacing', min: 3 },
    { op: 'distv', label: 'Distribute vertical spacing', min: 3 },
  ],
]

export function AlignBar({ count, onAlign, onCopyLayout, copied }: {
  count: number
  onAlign: (op: AlignOp) => void
  onCopyLayout: () => void
  copied: boolean
}) {
  return (
    <div className="hud align-bar">
      {GROUPS.map((g, gi) => (
        <div className="group" key={gi}>
          {g.map((b) => (
            <button key={b.op} className="icon" title={b.label} disabled={count < b.min} onClick={() => onAlign(b.op)}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                {ICONS[b.op]}
              </svg>
            </button>
          ))}
        </div>
      ))}
      <span className="count">{count ? `${count} selected` : 'Drag to select'}</span>
      <button className="text" onClick={onCopyLayout} title="Copy positions as JSON for src/slides/layout.json">
        {copied ? 'Copied' : 'Copy layout'}
      </button>
    </div>
  )
}
