/** Tiny markdown subset for speaker notes: #, ##, -, **bold**, blank-line paragraphs. */
export function Notes({ text }: { text: string }) {
  if (!text.trim()) return <p className="muted">No notes for this slide.</p>
  const bold = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((t, i) =>
      t.startsWith('**') ? <strong key={i}>{t.slice(2, -2)}</strong> : t,
    )
  return (
    <>
      {text.split('\n').map((l, i) => {
        if (!l.trim()) return <div key={i} style={{ height: 10 }} />
        if (l.startsWith('## ')) return <h3 key={i}>{bold(l.slice(3))}</h3>
        if (l.startsWith('# ')) return <h2 key={i}>{bold(l.slice(2))}</h2>
        if (/^[-*] /.test(l)) return <li key={i}>{bold(l.slice(2))}</li>
        return <p key={i}>{bold(l)}</p>
      })}
    </>
  )
}
