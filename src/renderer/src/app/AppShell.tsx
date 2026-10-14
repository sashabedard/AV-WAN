import { TopBar } from './TopBar'
import { Toast } from './Toast'
import { Welcome } from './Welcome'
import { Sidebar } from '../panels/Sidebar'
import { Inspector } from '../panels/Inspector'
import { Canvas } from '../canvas/Canvas'

export function AppShell() {
  return (
    <div className="shell">
      <TopBar />
      <aside className="shell__left" aria-label="Palette">
        <Sidebar />
      </aside>
      <main className="shell__center">
        <Canvas />
      </main>
      <aside className="shell__right" aria-label="Inspecteur">
        <Inspector />
      </aside>
      <Toast />
      <Welcome />
    </div>
  )
}
