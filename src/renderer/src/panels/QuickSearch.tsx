// src/renderer/src/panels/QuickSearch.tsx
import { useMemo, useState } from 'react'
import { searchTemplates } from '../catalog/search'
import { DeviceIcon, Icon } from '../icons/Icon'
import './panels.css'

const MAX_RESULTS = 12

export function QuickSearch({ onPick, onClose }: { onPick: (templateId: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const results = useMemo(() => searchTemplates(query).slice(0, MAX_RESULTS), [query])
  const pick = (i: number): void => {
    const t = results[i]
    if (t) onPick(t.id)
  }
  return (
    <div
      className="qs__backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="qs" role="dialog" aria-label="Rechercher un appareil">
        <div className="qs__field">
          <Icon name="search" size={18} />
          <input
            autoFocus
            className="qs__input"
            aria-label="Rechercher"
            placeholder="ptz, esp32 poe, dante…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                pick(active)
              } else if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                onClose()
              }
            }}
          />
        </div>
        <ul className="qs__list" role="listbox" aria-label="Résultats">
          {results.map((t, i) => (
            <li
              key={t.id}
              data-id={t.id}
              role="option"
              aria-selected={i === active}
              className={`qs__item${i === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(i)
              }}
            >
              <DeviceIcon icon={t.icon} size={18} />
              <span className="qs__name">{t.name}</span>
              <span className="qs__code">{t.code}</span>
            </li>
          ))}
          {results.length === 0 && <li className="qs__empty">Aucun appareil ne correspond.</li>}
        </ul>
      </div>
    </div>
  )
}
