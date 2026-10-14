import { useEffect } from 'react'
import { openRequestAction } from './fileActions'

// Fichiers ouverts par le système : on s'abonne, puis on dit au processus principal que l'interface est prête.
export function useOpenRequests(): void {
  useEffect(() => {
    const off = window.avwan.onOpenRequest((request) => void openRequestAction(request))
    window.avwan.rendererReady()
    return off
  }, [])
}
