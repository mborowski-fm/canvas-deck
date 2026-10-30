import { useEffect, useRef, useState } from 'react'
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

/** Edit-mode bar: add/delete elements, history, align popover, reset, save. */
export function AlignBar({ count, onAlign, onUndo, onRedo, canUndo, canRedo, onReset, onSave, saveLabel, onAdd, onDelete, canDelete }: {
  count: number
  onAlign: (op: AlignOp) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onReset: () => void
  /** dev only; hidden on the deployed site */
  onSave?: () => void
  saveLabel: string
  onAdd: () => void
  onDelete: () => void
  canDelete: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div className="hud align-bar">
      <div className="group">
        <button className="icon" title="Add image, video or web page" onClick={onAdd}>
          <Icon name="add" />
        </button>
        <button className="icon" title="Delete selected elements (Delete)" disabled={!canDelete} onClick={onDelete}>
          <Icon name="delete" />
        </button>
      </div>
      <div className="group">
        <button className="icon" title="Undo (Cmd+Z)" disabled={!canUndo} onClick={onUndo}>
          <Icon name="undo" />
        </button>
        <button className="icon" title="Redo (Cmd+Shift+Z)" disabled={!canRedo} onClick={onRedo}>
          <Icon name="redo" />
        </button>
      </div>
      <div className="group popover-anchor" ref={ref}>
        <button className={'pill' + (open ? ' on' : '')} aria-expanded={open} title="Align and arrange" disabled={count < 2} onClick={() => setOpen((v) => !v)}>
          <Icon name="align_horizontal_left" />
          Align
          <Icon name={open ? 'keyboard_arrow_down' : 'keyboard_arrow_up'} />
        </button>
        {open && count >= 2 && (
          <div className="popover" role="menu">
            {GROUPS.map((g, gi) => (
              <div className="row" key={gi}>
                {g.map((b) => (
                  <button key={b.op} className="icon" title={b.label} disabled={count < b.min} onClick={() => onAlign(b.op)}>
                    <Icon name={ICONS[b.op]} />
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      <span className="count">{count ? `${count} selected` : 'Drag to select'}</span>
      <button className="icon" title="Reset layout to the original arrangement" onClick={onReset}>
        <Icon name="restart_alt" />
      </button>
      {onSave && (
        <button className="cta" onClick={onSave} title="Write positions to src/slides/layout.json">
          <Icon name="save" />
          {saveLabel}
        </button>
      )}
    </div>
  )
}
