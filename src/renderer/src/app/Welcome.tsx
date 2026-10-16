// src/renderer/src/app/Welcome.tsx
import { useEffect, useState } from 'react'
import { useT } from '../i18n/useT'
import { createExampleProject } from '../samples/exampleProject'
import { isDirty, projectStore } from '../store/projectStore'
import { uiStore, useUiStore } from '../store/uiStore'
import { LangToggle } from './LangToggle'
import { BrandMark } from './BrandMark'
import { openProjectAction, openRecentAction } from './fileActions'
import { fileNameOf } from './fileName'
import { RecoveryBanner } from './RecoveryBanner'

export function Welcome() {
  const open = useUiStore((s) => s.welcome)
  const { m, lang } = useT()
  const [recent, setRecent] = useState<string[]>([])
  useEffect(() => {
    if (!open) return
    window.avwan.recent.list().then(setRecent, () => setRecent([]))
  }, [open])
  if (!open) return null
  const close = (): void => uiStore.getState().setWelcome(false)
  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-label={m.welcome.title}>
      <div
        className="welcome__card"
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return
          // Document intact (créé au chargement) : on repart d'un projet vierge dans la langue courante.
          const s = projectStore.getState()
          if (s.filePath === null && !isDirty(s)) s.newProject()
          close()
        }}
      >
        <div className="welcome__lang">
          <LangToggle />
        </div>
        <BrandMark size={56} />
        <h1 className="welcome__word">
          AV<span className="wordmark__dot">·</span>WAN
        </h1>
        <p className="welcome__sub">{m.common.appSubtitle}</p>
        <p className="welcome__tagline">{m.welcome.tagline}</p>
        <RecoveryBanner />
        <div className="welcome__actions">
          <button
            type="button"
            className="btn btn--primary"
            autoFocus
            onClick={() => {
              projectStore.getState().newProject()
              close()
            }}
          >
            {m.welcome.newProject}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              projectStore.getState().loadProject(createExampleProject(undefined, lang), null)
              close()
            }}
          >
            {m.welcome.exampleProject}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              close()
              void openProjectAction()
            }}
          >
            {m.welcome.open}
          </button>
        </div>
        {recent.length > 0 && (
          <section className="welcome__recent">
            <h2 className="welcome__h">{m.welcome.recent}</h2>
            <ul>
              {recent.map((path) => (
                <li key={path}>
                  <button
                    type="button"
                    className="welcome__file"
                    title={path}
                    onClick={() => {
                      close()
                      void openRecentAction(path)
                    }}
                  >
                    {fileNameOf(path)}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="welcome__pun">{m.welcome.pun}</p>
      </div>
    </div>
  )
}
