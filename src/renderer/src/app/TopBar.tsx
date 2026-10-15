import { useRef } from 'react'
import { isDirty, useProjectStore } from '../store/projectStore'
import { fileNameOf } from './fileName'
import { BrandMark } from './BrandMark'
import { ThemeToggle } from './ThemeToggle'
import { uiStore } from '../store/uiStore'
import { Icon } from '../icons/Icon'
import { useWindowChrome } from './useWindowChrome'

export function TopBar() {
  const filePath = useProjectStore((s) => s.filePath)
  const dirty = useProjectStore(isDirty)
  const readOnly = useProjectStore((s) => s.readOnly)
  const bar = useRef<HTMLElement>(null)
  useWindowChrome(bar)
  // Sans barre de titre, Windows perd sa barre de menus : le bouton ☰ ouvre le même menu.
  const platform = window.avwan?.platform
  return (
    <header className="topbar shell__top" ref={bar}>
      {platform && platform !== 'darwin' && (
        <button
          type="button"
          className="topbar__menu"
          aria-label="Menu"
          title="Fichier, Édition, Affichage, Aide"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            window.avwan.window.showMenu(r.left, r.bottom)
          }}
        >
          <Icon name="menu" size={18} />
        </button>
      )}
      <BrandMark />
      <span className="wordmark" aria-label="AV·WAN">
        AV<span className="wordmark__dot">·</span>WAN
      </span>
      <span className="topbar__file" data-testid="file-name">
        {dirty && (
          <span className="topbar__dirty" title="Modifications non enregistrées">
            ●
          </span>
        )}
        {fileNameOf(filePath)}
      </span>
      {readOnly && <span className="topbar__badge">Lecture seule</span>}
      <span className="topbar__spacer" />
      <button type="button" className="topbar__btn" title="Exporter le PDF, le CSV ou le classeur Excel (⌘E)" onClick={() => uiStore.getState().setExportOpen(true)}>
        Exporter
      </button>
      <ThemeToggle />
    </header>
  )
}
