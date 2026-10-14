import { useEffect } from 'react'
import { projectStore, useProjectStore } from '../store/projectStore'

export function Toast() {
  const toast = useProjectStore((s) => s.toast)
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => projectStore.getState().clearToast(), 4500)
    return () => clearTimeout(timer)
  }, [toast])
  return toast ? (
    <div className="toast" role="status">
      {toast}
    </div>
  ) : null
}
