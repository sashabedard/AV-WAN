import { useEffect, useState } from 'react'
import type { RecoveryEntry } from '../../../shared/api'
import { restoreRecoveryAction } from './fileActions'
import { fileNameOf } from './fileName'
import { useT } from '../i18n/useT'
import { timeAgo } from './timeAgo'

const MAX_ROWS = 3

const labelOf = (e: RecoveryEntry, untitled: string): string => (e.path ? fileNameOf(e.path) : e.title.trim() || untitled)

// Bandeau de l'accueil : le travail non enregistré retrouvé après un arrêt imprévu (spec plan 4 § 5.4).
export function RecoveryBanner() {
  const { m } = useT()
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
    <section className="recovery" aria-label={m.welcome.recovery.title}>
      <h2 className="welcome__h">{m.welcome.recovery.title}</h2>
      <ul>
        {entries.map((e) => {
          const label = labelOf(e, m.app.untitled)
          return (
            <li key={e.key} className="recovery__row">
              <span className="recovery__what" title={e.path ?? undefined}>
                <strong>{label}</strong> <span className="recovery__when">({timeAgo(e.savedAt)})</span>
              </span>
              <button type="button" className="btn btn--primary" aria-label={m.welcome.recovery.restoreLabel({ name: label })} onClick={() => void restoreRecoveryAction(e.key)}>
                {m.welcome.recovery.restore}
              </button>
              <button
                type="button"
                className="btn"
                aria-label={m.welcome.recovery.ignoreLabel({ name: label })}
                onClick={() => {
                  void window.avwan.recovery.discard(e.key).catch(() => undefined)
                  setEntries((list) => list.filter((x) => x.key !== e.key))
                }}
              >
                {m.welcome.recovery.ignore}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
