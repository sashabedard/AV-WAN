import { TopBar } from './TopBar'
import { Toast } from './Toast'
import { Palette } from '../panels/Palette'
import { Canvas } from '../canvas/Canvas'

export function AppShell() {
  return (
    <div className="shell">
      <TopBar />
      <aside className="shell__left" aria-label="Palette">
        <Palette />
      </aside>
      <main className="shell__center">
        <Canvas />
      </main>
      <aside className="shell__right" aria-label="Inspecteur" />
      <Toast />
    </div>
  )
}
