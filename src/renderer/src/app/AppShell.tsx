import { useT } from '../i18n/useT'
import { TopBar } from './TopBar'
import { Toast } from './Toast'
import { Welcome } from './Welcome'
import { ExportDialog } from '../export/ExportDialog'
import { ComponentEditor } from '../panels/ComponentEditor'
import { Sidebar } from '../panels/Sidebar'
import { Inspector } from '../panels/Inspector'
import { Canvas } from '../canvas/Canvas'
import { UpdateBanner } from './UpdateBanner'
import { SidebarResizer } from './SidebarResizer'

export function AppShell() {
  const { m } = useT()
  return (
    <div className="shell">
      <TopBar />
      <aside className="shell__left" aria-label={m.app.shell.leftPanel}>
        <Sidebar />
      </aside>
      <SidebarResizer />
      <main className="shell__center">
        <Canvas />
        <UpdateBanner />
      </main>
      <aside className="shell__right" aria-label={m.app.shell.inspector}>
        <Inspector />
      </aside>
      <Toast />
      <ExportDialog />
      <ComponentEditor />
      <Welcome />
    </div>
  )
}
