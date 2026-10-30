import { Icon } from '../Icon'
import type { AlignOp } from './align'

const ICONS: Record<AlignOp, string> = {
  left: 'align_horizontal_left',
  hcenter: 'align_horizontal_center',
  right: 'align_horizontal_right',
  top: 'align_vertical_top',
  vcenter: 'align_vertical_center',
  bottom: 'align_vertical_bottom',
  disth: 'horizontal_distribute',
  distv: 'vertical_distribute',
  grid: 'grid_view',
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
    { op: 'grid', label: 'Arrange in grid', min: 2 },
  ],
]


export function AlignBar({ count, onAlign, onCopyLayout, copied, onUndo, onRedo, canUndo, canRedo }: {
  count: number
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onAlign: (op: AlignOp) => void
  onCopyLayout: () => void
  copied: boolean
}) {
  return (
    <div className="hud align-bar">
      <div className="group">
        <button className="icon" title="Undo (Cmd+Z)" disabled={!canUndo} onClick={onUndo}>
          <Icon name="undo" />
        </button>
        <button className="icon" title="Redo (Cmd+Shift+Z)" disabled={!canRedo} onClick={onRedo}>
          <Icon name="redo" />
        </button>
      </div>
      {GROUPS.map((g, gi) => (
        <div className="group" key={gi}>
          {g.map((b) => (
            <button key={b.op} className="icon" title={b.label} disabled={count < b.min} onClick={() => onAlign(b.op)}>
              <Icon name={ICONS[b.op]} />
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
