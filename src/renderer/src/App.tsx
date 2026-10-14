import { AppShell } from './app/AppShell'
import { useMenuBridge } from './app/useMenuBridge'
import { useDocumentTitle } from './app/useDocumentTitle'

export function App() {
  useMenuBridge()
  useDocumentTitle()
  return <AppShell />
}
