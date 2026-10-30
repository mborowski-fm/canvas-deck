/** Google Material Symbols (Sharp, filled). New names must also be added to the font URL in index.html. */
export function Icon({ name }: { name: string }) {
  return (
    <span className="msr" aria-hidden="true">
      {name}
    </span>
  )
}
