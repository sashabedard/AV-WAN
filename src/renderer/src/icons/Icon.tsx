import type { IconRef } from '../model/types'
import { GLYPHS, UI_GLYPHS, isBuiltinIcon, type IconName } from './glyphs'
import './icons.css'

export interface IconProps {
  name: IconName
  size?: number
  title?: string
  className?: string
}

export function Icon({ name, size = 20, title, className }: IconProps) {
  const paths = isBuiltinIcon(name) ? GLYPHS[name] : UI_GLYPHS[name]
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true }
  return (
    <svg className={className ? `icon ${className}` : 'icon'} viewBox="0 0 24 24" width={size} height={size} {...a11y}>
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}

// Seul un SVG en base64 (produit par importIcon) sert de masque : une dataUri tierce ne peut pas injecter de CSS.
const MASKABLE = /^data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+$/

// Icône d'un appareil : maison, ou image importée (composantes perso). Une image « tint » prend la couleur du texte.
export function DeviceIcon({ icon, size = 20 }: { icon: IconRef | undefined; size?: number }) {
  if (icon?.kind === 'image') {
    if (icon.tint && MASKABLE.test(icon.dataUri)) {
      const mask = `url("${icon.dataUri}")`
      return <span className="icon icon--mask" style={{ width: size, height: size, maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true" />
    }
    return <img className="icon icon--image" src={icon.dataUri} width={size} height={size} alt="" />
  }
  return <Icon name={icon && isBuiltinIcon(icon.name) ? icon.name : 'generic'} size={size} />
}
