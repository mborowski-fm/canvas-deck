/**
 * Tiny markdown subset for speaker notes: #, ##, - (indented = nested), 1. numbered,
 * **bold**, *italic*, blank-line paragraphs.
 */
export function Notes({ text }: { text: string }) {
  if (!text.trim()) return <p className="muted">No notes for this slide.</p>
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((t, i) =>
      t.startsWith('**') ? <strong key={i}>{t.slice(2, -2)}</strong>
        : t.length > 2 && t.startsWith('*') && t.endsWith('*') ? <em key={i}>{t.slice(1, -1)}</em>
        : t,
    )
  return (
    <>
      {text.split('\n').map((l, i) => {
        if (!l.trim()) return <div key={i} style={{ height: 10 }} />
        if (l.startsWith('## ')) return <h3 key={i}>{inline(l.slice(3))}</h3>
        if (l.startsWith('# ')) return <h2 key={i}>{inline(l.slice(2))}</h2>
        const item = /^(\s*)[-*] (.*)$/.exec(l)
        if (item) return <li key={i} style={item[1] ? { marginLeft: 20 } : undefined}>{inline(item[2])}</li>
        return <p key={i}>{inline(l)}</p>
      })}
    </>
  )
}
