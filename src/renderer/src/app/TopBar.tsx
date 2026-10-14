import { isDirty, useProjectStore } from '../store/projectStore'
import { fileNameOf } from './fileActions'
import { BrandMark } from './BrandMark'
import { ThemeToggle } from './ThemeToggle'

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
      <ThemeToggle />
    </header>
  )
}
