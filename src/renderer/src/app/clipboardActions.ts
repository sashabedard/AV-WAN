// src/renderer/src/app/clipboardActions.ts
import { useEffect } from 'react'
import { FRAGMENT_MIME, copyFragment, parseFragment, serializeFragment, type Fragment } from '../model/clipboard'
import { projectStore } from '../store/projectStore'
import { isTextInput } from './routeEditCommand'

const STEP = 24
// Copie interne : secours quand le presse-papiers système n'a pas de fragment lisible.
let clip: { fragment: Fragment; key: string; pastes: number } | null = null

export function resetClipboard(): void {
  clip = null
}

export function copySelection(data: DataTransfer | null): boolean {
  const s = projectStore.getState()
  const fragment = copyFragment(s.history.present, s.selection.deviceIds)
  if (!fragment) return false
  const key = serializeFragment(fragment)
  clip = { fragment, key, pastes: 0 }
  data?.setData(FRAGMENT_MIME, key)
  return true
}

export function cutSelection(data: DataTransfer | null): boolean {
  if (!copySelection(data)) return false
  const s = projectStore.getState()
  s.removeElements(s.selection.deviceIds, s.selection.linkIds)
  return true
}

export function pasteFragmentFrom(data: DataTransfer | null): boolean {
  const text = data?.getData(FRAGMENT_MIME) ?? ''
  if (text && text !== clip?.key) {
    const fragment = parseFragment(text)
    if (fragment) clip = { fragment, key: text, pastes: 0 }
  }
  if (!clip) return false
  clip.pastes += 1
  const offset = STEP * clip.pastes
  return projectStore.getState().pasteFragment(clip.fragment, { x: offset, y: offset }).length > 0
}

export function duplicateSelection(): boolean {
  const s = projectStore.getState()
  const fragment = copyFragment(s.history.present, s.selection.deviceIds)
  return fragment ? s.pasteFragment(fragment, { x: STEP, y: STEP }).length > 0 : false
}

// Les rôles natifs Copier/Couper/Coller déclenchent les événements du document.
// Chromium n'active ces commandes hors d'un champ que si beforecopy/beforecut/beforepaste est annulé.
export function useClipboardEvents(): void {
  useEffect(() => {
    const outsideText = (): boolean => !isTextInput(document.activeElement)
    const enable = (e: Event): void => {
      if (outsideText()) e.preventDefault()
    }
    const onCopy = (e: ClipboardEvent): void => {
      if (outsideText() && copySelection(e.clipboardData)) e.preventDefault()
    }
    const onCut = (e: ClipboardEvent): void => {
      if (outsideText() && cutSelection(e.clipboardData)) e.preventDefault()
    }
    const onPaste = (e: ClipboardEvent): void => {
      if (outsideText() && pasteFragmentFrom(e.clipboardData)) e.preventDefault()
    }
    const before = ['beforecopy', 'beforecut', 'beforepaste'] as const
    for (const type of before) document.addEventListener(type, enable)
    document.addEventListener('copy', onCopy)
    document.addEventListener('cut', onCut)
    document.addEventListener('paste', onPaste)
    return () => {
      for (const type of before) document.removeEventListener(type, enable)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('cut', onCut)
      document.removeEventListener('paste', onPaste)
    }
  }, [])
}
