import { AppShell } from './app/AppShell'
import { useMenuBridge } from './app/useMenuBridge'
import { useDocumentTitle } from './app/useDocumentTitle'
import { useFileDropGuard } from './app/useFileDropGuard'
import { useClipboardEvents } from './app/clipboardActions'
import { useOpenRequests } from './app/useOpenRequests'
import { useAutosave } from './app/autosave'

export function App() {
  useMenuBridge()
  useDocumentTitle()
  useFileDropGuard()
  useClipboardEvents()
  useOpenRequests()
  useAutosave()
  return <AppShell />
}
