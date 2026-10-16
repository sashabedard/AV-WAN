import { useState } from 'react'
import { useProject } from '../store/projectStore'
import { useT } from '../i18n/useT'
import { DEVICE_MIME } from './rackDelete'

// Appareils pas encore en baie : on les glisse vers un U libre (spec § 4.2).
export function UnplacedList({ disabled }: { disabled: boolean }) {
  const { m } = useT()
  const project = useProject()
  const [filter, setFilter] = useState('')
  const q = filter.trim().toLowerCase()
  const items = project.devices.filter((d) => !d.rack && (q === '' || d.name.toLowerCase().includes(q)))
  return (
    <aside className="racks__list" aria-label={m.racks.unplacedTitle}>
      <h3 className="racks__list-title">{m.racks.unplacedTitle}</h3>
      <input className="input" value={filter} placeholder={m.racks.unplacedFilter} aria-label={m.racks.unplacedFilter} onChange={(e) => setFilter(e.target.value)} />
      {items.length === 0 ? (
        <p className="racks__list-empty">{m.racks.unplacedEmpty}</p>
      ) : (
        <ul className="racks__items">
          {items.map((d) => (
            <li
              key={d.id}
              className="racks__item"
              draggable={!disabled}
              data-testid={`unplaced-${d.name}`}
              onDragStart={(e) => {
                e.dataTransfer.setData(DEVICE_MIME, d.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
            >
              {d.name}
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
