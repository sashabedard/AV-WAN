// src/renderer/src/app/WhatsNew.tsx
import { useEffect, useRef } from 'react'
import { uiStore, useUiStore } from '../store/uiStore'
import { useT } from '../i18n/useT'
import { BrandMark } from './BrandMark'
import { takeWhatsNew } from './whatsNewSeen'
import { version } from '../../../../package.json'
import '../export/export.css'

// Au démarrage : ouvre l'écran si cette version n'a pas encore été présentée.
export function useWhatsNewOnLaunch(): void {
  useEffect(() => {
    let storage: Storage | null = null
    try {
      storage = window.localStorage
    } catch {
      storage = null
    }
    if (takeWhatsNew(version, storage, window.avwan?.isE2E ?? false)) uiStore.getState().setWhatsNewOpen(true)
  }, [])
}

// Écran « Quoi de neuf » : au premier lancement d'une nouvelle version (useWhatsNewOnLaunch), ou par Aide.
export function WhatsNew() {
  const open = useUiStore((s) => s.whatsNewOpen)
  return open ? <WhatsNewCard /> : null
}

function WhatsNewCard() {
  const t = useT().m.whatsNew
  const button = useRef<HTMLButtonElement>(null)
  const close = (): void => uiStore.getState().setWhatsNewOpen(false)
  useEffect(() => button.current?.focus(), [])
  return (
    <div
      className="xd wn"
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close()
      }}
    >
      <div className="xd__card wn__card">
        <header className="wn__head">
          <BrandMark />
          <h2 className="xd__title">{t.title}</h2>
        </header>
        <p className="wn__intro">{t.intro}</p>
        <ul className="wn__list">
          {t.items.map((item) => (
            <li key={item.title} className="wn__item">
              <span className="wn__dot" aria-hidden="true" />
              <span>
                <strong className="wn__name">{item.title}</strong>
                <span className="wn__text">{item.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <aside className="wn__note">
          <strong>{t.noteTitle}</strong> {t.note}
        </aside>
        <div className="xd__actions">
          <button ref={button} type="button" className="btn btn--primary" onClick={close}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  )
}
