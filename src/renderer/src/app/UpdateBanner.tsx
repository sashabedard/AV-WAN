import { useEffect, useState } from 'react'

// Bandeau discret en haut du canvas : une nouvelle version est téléchargée (spec plan 4 § 3.5).
export function UpdateBanner() {
  const [version, setVersion] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    let alive = true
    const off = window.avwan.onUpdateReady((v) => {
      setVersion(v)
      setHidden(false)
    })
    window.avwan.updates.pending().then(
      (v) => {
        if (alive && v) setVersion(v)
      },
      () => undefined
    )
    return () => {
      alive = false
      off()
    }
  }, [])
  if (!version || hidden) return null
  return (
    <div className="update" role="status">
      <span>AV·WAN {version} est prête.</span>
      <button type="button" className="btn btn--primary" onClick={() => window.avwan.updates.install()}>
        Redémarrer maintenant
      </button>
      <button type="button" className="update__close" aria-label="Plus tard" title="Plus tard : elle s’installera à la fermeture" onClick={() => setHidden(true)}>
        ✕
      </button>
    </div>
  )
}
