// src/renderer/src/app/BrandMark.tsx
// Version miniature de l'icône d'app (build/icon.svg) : façade, trois fiches, trois cordons.
const COLUMNS = [
  { x: 7.5, tone: 'a' },
  { x: 12, tone: 'b' },
  { x: 16.5, tone: 'c' }
] as const

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg className="brandmark" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <rect className="brandmark__tile" x="1" y="1" width="22" height="22" rx="5" />
      {COLUMNS.map((c) => (
        <path key={`cord-${c.tone}`} className={`brandmark__cord brandmark__cord--${c.tone}`} d={`M${c.x} 11V22.25`} />
      ))}
      {COLUMNS.map((c) => (
        <rect key={`plug-${c.tone}`} className={`brandmark__plug brandmark__plug--${c.tone}`} x={c.x - 1.6} y="6.5" width="3.2" height="5" rx="0.7" />
      ))}
    </svg>
  )
}
