import { TopBar } from './TopBar'
import { Toast } from './Toast'

export function AppShell() {
  return (
    <div className="shell">
      <TopBar />
      <aside className="shell__left" aria-label="Palette" />
      <main className="shell__center" />
      <aside className="shell__right" aria-label="Inspecteur" />
      <Toast />
    </div>
  )
}
