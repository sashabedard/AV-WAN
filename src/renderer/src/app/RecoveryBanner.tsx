import { useEffect, useState } from 'react'
import type { RecoveryEntry } from '../../../shared/api'
import { fileNameOf, restoreRecoveryAction } from './fileActions'
import { timeAgo } from './timeAgo'

const MAX_ROWS = 3

const labelOf = (e: RecoveryEntry): string => (e.path ? fileNameOf(e.path) : e.title.trim() || 'Sans titre')

// Bandeau de l'accueil : le travail non enregistré retrouvé après un arrêt imprévu (spec plan 4 § 5.4).
export function RecoveryBanner() {
  const [entries, setEntries] = useState<RecoveryEntry[]>([])
  useEffect(() => {
    let alive = true
    Promise.resolve()
      .then(() => window.avwan.recovery.list())
      .then(
        (list) => {
          if (alive) setEntries(list.slice(0, MAX_ROWS))
        },
        () => {
          if (alive) setEntries([])
        }
      )
    return () => {
      alive = false
    }
  }, [])
  if (entries.length === 0) return null
  return (
    <section className="recovery" aria-label="Travail non enregistré">
      <h2 className="welcome__h">Travail non enregistré</h2>
      <ul>
        {entries.map((e) => {
          const label = labelOf(e)
          return (
            <li key={e.key} className="recovery__row">
              <span className="recovery__what" title={e.path ?? undefined}>
                <strong>{label}</strong> <span className="recovery__when">({timeAgo(e.savedAt)})</span>
              </span>
              <button type="button" className="btn btn--primary" aria-label={`Restaurer ${label}`} onClick={() => void restoreRecoveryAction(e.key)}>
                Restaurer
              </button>
              <button
                type="button"
                className="btn"
                aria-label={`Ignorer ${label}`}
                onClick={() => {
                  void window.avwan.recovery.discard(e.key).catch(() => undefined)
                  setEntries((list) => list.filter((x) => x.key !== e.key))
                }}
              >
                Ignorer
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
