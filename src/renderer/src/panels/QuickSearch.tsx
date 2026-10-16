// src/renderer/src/panels/QuickSearch.tsx
import { useMemo, useState } from 'react'
import { searchTemplates } from '../catalog/search'
import { usePlaceableTemplates } from './usePlaceableTemplates'
import { DeviceIcon, Icon } from '../icons/Icon'
import { displayName } from '../catalog/templateText'
import { useT } from '../i18n/useT'
import './panels.css'

const MAX_RESULTS = 12

export function QuickSearch({ onPick, onClose }: { onPick: (templateId: string) => void; onClose: () => void }) {
  const { m, lang } = useT()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const { all } = usePlaceableTemplates()
  const results = useMemo(() => searchTemplates(query, all).slice(0, MAX_RESULTS), [query, all])
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
      <div className="qs" role="dialog" aria-label={m.quickSearch.dialog}>
        <div className="qs__field">
          <Icon name="search" size={18} />
          <input
            autoFocus
            className="qs__input"
            aria-label={m.quickSearch.inputLabel}
            placeholder={m.quickSearch.placeholder}
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
        <ul className="qs__list" role="listbox" aria-label={m.quickSearch.results}>
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
              <span className="qs__name">{displayName(t, lang)}</span>
              <span className="qs__code">{t.code}</span>
            </li>
          ))}
          {results.length === 0 && <li className="qs__empty">{m.quickSearch.noMatch}</li>}
        </ul>
      </div>
    </div>
  )
}
