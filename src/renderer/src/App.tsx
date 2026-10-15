import { AppShell } from './app/AppShell'
import { useMenuBridge } from './app/useMenuBridge'
import { useDocumentTitle } from './app/useDocumentTitle'
import { useFileDropGuard } from './app/useFileDropGuard'
import { useClipboardEvents } from './app/clipboardActions'
import { useOpenRequests } from './app/useOpenRequests'
import { useAutosave } from './app/autosave'
import { useFileAutoSave } from './app/fileAutoSave'
import { useLibraryLoad } from './app/useLibraryLoad'
import { useDmxChannelsLoad } from './app/useDmxChannelsLoad'
import { useSettingsSync } from './app/useSettingsSync'

export function App() {
  useMenuBridge()
  useDocumentTitle()
  useFileDropGuard()
  useClipboardEvents()
  useOpenRequests()
  useAutosave()
  useFileAutoSave()
  useLibraryLoad()
  useDmxChannelsLoad()
  useSettingsSync()
  return <AppShell />
}
