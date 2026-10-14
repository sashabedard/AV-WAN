// src/renderer/src/app/Welcome.tsx
import { useEffect, useState } from 'react'
import { APP_SUBTITLE } from '../../../shared/appInfo'
import { createExampleProject } from '../samples/exampleProject'
import { projectStore } from '../store/projectStore'
import { uiStore, useUiStore } from '../store/uiStore'
import { BrandMark } from './BrandMark'
import { fileNameOf, openProjectAction, openRecentAction } from './fileActions'

export function Welcome() {
  const open = useUiStore((s) => s.welcome)
  const [recent, setRecent] = useState<string[]>([])
  useEffect(() => {
    if (!open) return
    window.avwan.recent.list().then(setRecent, () => setRecent([]))
  }, [open])
  if (!open) return null
  const close = (): void => uiStore.getState().setWelcome(false)
  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-label="Accueil">
      <div
        className="welcome__card"
        onKeyDown={(e) => {
          if (e.key === 'Escape') close()
        }}
      >
        <BrandMark size={56} />
        <h1 className="welcome__word">
          AV<span className="wordmark__dot">·</span>WAN
        </h1>
        <p className="welcome__sub">{APP_SUBTITLE}</p>
        <p className="welcome__tagline">Planifier. Brancher. Documenter.</p>
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
            Nouveau projet
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              projectStore.getState().loadProject(createExampleProject(), null)
              close()
            }}
          >
            Projet exemple : installation interactive
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              close()
              void openProjectAction()
            }}
          >
            Ouvrir…
          </button>
        </div>
        {recent.length > 0 && (
          <section className="welcome__recent">
            <h2 className="welcome__h">Fichiers récents</h2>
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
        <p className="welcome__pun">Que le réseau soit avec toi.</p>
      </div>
    </div>
  )
}
