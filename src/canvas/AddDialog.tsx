import { useRef, useState } from 'react'
import { Icon } from '../Icon'

/** Edit mode: add an image, video, YouTube/Vimeo or web page by link, or (dev) a local file. */
export function AddDialog({ onLink, onFiles, canUpload, onClose }: {
  onLink: (url: string) => void
  onFiles: (files: File[]) => void
  canUpload: boolean
  onClose: () => void
}) {
  const [url, setUrl] = useState('')
  const file = useRef<HTMLInputElement>(null)
  return (
    <div className="modal scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (url.trim()) onLink(url.trim())
        }}
      >
        <h2>Add to canvas</h2>
        <p>Paste a link to an image, a video (mp4, YouTube, Vimeo) or a web page. You can also drop files or links straight onto the canvas.</p>
        <input autoFocus placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        <div className="actions">
          {canUpload ? (
            <>
              <input ref={file} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => e.target.files && onFiles([...e.target.files])} />
              <button type="button" className="text" onClick={() => file.current?.click()}>
                <Icon name="upload_file" />
                Choose file
              </button>
            </>
          ) : (
            <small className="muted">Files can be added only locally (npm run dev).</small>
          )}
          <span style={{ flex: 1 }} />
          <button type="button" className="text" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={!url.trim()}>Add</button>
        </div>
      </form>
    </div>
  )
}
