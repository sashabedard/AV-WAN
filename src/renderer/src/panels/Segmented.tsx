export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel
}: {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}) {
  return (
    <div className="seg" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="seg__btn"
          aria-pressed={o.value === value}
          onClick={() => {
            if (o.value !== value) onChange(o.value) // recliquer la valeur active : aucune modification
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
