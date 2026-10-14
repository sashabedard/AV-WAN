// src/renderer/src/app/useMenuBridge.ts
import { useEffect } from 'react'
import { handleMenuAction } from './menuActions'

export function useMenuBridge(): void {
  useEffect(() => window.avwan.onMenu(handleMenuAction), [])
}
