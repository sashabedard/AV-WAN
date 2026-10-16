import { useRef } from 'react'
import { useT } from '../i18n/useT'
import { isDirty, useProjectStore } from '../store/projectStore'
import { fileNameOf } from './fileName'
import { BrandMark } from './BrandMark'
import { LangToggle } from './LangToggle'
import { ThemeToggle } from './ThemeToggle'
import { uiStore } from '../store/uiStore'
import { Icon } from '../icons/Icon'
import { useWindowChrome } from './useWindowChrome'

export function TopBar() {
  const filePath = useProjectStore((s) => s.filePath)
  const dirty = useProjectStore(isDirty)
  const readOnly = useProjectStore((s) => s.readOnly)
  const { m } = useT()
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
          aria-label={m.topbar.menu}
          title={m.topbar.menuTitle}
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
          <span className="topbar__dirty" title={m.topbar.unsaved}>
            ●
          </span>
        )}
        {fileNameOf(filePath)}
      </span>
      {readOnly && <span className="topbar__badge">{m.topbar.readOnly}</span>}
      <span className="topbar__spacer" />
      <button type="button" className="topbar__btn" title={m.topbar.exportTitle} onClick={() => uiStore.getState().setExportOpen(true)}>
        {m.topbar.export}
      </button>
      <LangToggle />
      <ThemeToggle />
    </header>
  )
}
