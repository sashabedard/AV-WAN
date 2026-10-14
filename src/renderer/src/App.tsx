import { AppShell } from './app/AppShell'
import { useMenuBridge } from './app/useMenuBridge'
import { useDocumentTitle } from './app/useDocumentTitle'
import { useFileDropGuard } from './app/useFileDropGuard'

export function App() {
  useMenuBridge()
  useDocumentTitle()
  useFileDropGuard()
  return <AppShell />
}
