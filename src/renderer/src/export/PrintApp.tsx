import { Component, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Project } from '../model/types'
import { parseProjectFile } from '../model/file'
import { messages } from '../../../shared/i18n/messages'
import { normalizePdfOptions, type PdfOptions } from '../../../shared/pdfOptions'
import { PrintDocument } from './PrintDocument'

// Une erreur de rendu ne doit jamais laisser le processus principal attendre jusqu'au délai maximal.
class PrintErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }
  override componentDidCatch(error: Error): void {
    window.avwan.print.failed(error.message)
  }
  override render(): ReactNode {
    return this.state.failed ? null : this.props.children
  }
}

// Fenêtre d'impression cachée : reçoit le projet par IPC, le met en page, puis signale qu'elle est prête.
export function PrintApp() {
  const [job, setJob] = useState<{ project: Project; options: PdfOptions } | null>(null)
  useEffect(() => {
    window.avwan.print.job().then(
      (j) => {
        const res = parseProjectFile(j.projectText, messages('fr')) // plan 6 : langue des documents à la Task 12
        if (!res.ok) window.avwan.print.failed(res.error)
        else setJob({ project: res.project, options: normalizePdfOptions(j.options) })
      },
      (e: unknown) => window.avwan.print.failed(e instanceof Error ? e.message : String(e))
    )
  }, [])
  const ready = useCallback(() => window.avwan.print.ready(), [])
  if (!job) return null
  return (
    <PrintErrorBoundary>
      <PrintDocument project={job.project} options={job.options} onReady={ready} />
    </PrintErrorBoundary>
  )
}
