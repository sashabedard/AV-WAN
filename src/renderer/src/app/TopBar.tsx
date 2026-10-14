import { isDirty, useProjectStore } from '../store/projectStore'
import { fileNameOf } from './fileActions'
import { BrandMark } from './BrandMark'
import { ThemeToggle } from './ThemeToggle'
import { uiStore } from '../store/uiStore'

export function TopBar() {
  const filePath = useProjectStore((s) => s.filePath)
  const dirty = useProjectStore(isDirty)
  const readOnly = useProjectStore((s) => s.readOnly)
  return (
    <header className="topbar shell__top">
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
