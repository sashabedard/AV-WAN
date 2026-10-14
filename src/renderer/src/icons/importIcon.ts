import type { IconRef } from '../model/types'

// Icône d'une composante perso (spec plan 4 § 6.3) : PNG gardé tel quel, SVG reconstruit par liste blanche.
// Le SVG assaini n'entre jamais dans le DOM : il est affiché par <img> ou par masque CSS.
export const ICON_MAX_BYTES = 256 * 1024
export type IconImport = { ok: true; icon: IconRef } | { ok: false; error: string }
export interface CleanSvg {
  svg: string
  monochrome: boolean
}

const SVG_NS = 'http://www.w3.org/2000/svg'
const ELEMENTS = new Set(['g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'title', 'desc'])
const SHAPES = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon'])
const ATTRIBUTES = new Set([
  'viewBox', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'points',
  'fill', 'fill-rule', 'fill-opacity', 'clip-rule', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'opacity', 'transform'
])
const UNSAFE_VALUE = /url\s*\(|javascript:|expression\s*\(/i
const NO_PAINT = new Set(['none', 'transparent'])
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

export function normalizeColor(value: string): string {
  const v = value.trim().toLowerCase()
  if (v === 'black') return '#000000'
  if (v === 'white') return '#ffffff'
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v)
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : v
}

function base64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

const isPng = (bytes: Uint8Array): boolean => PNG_SIGNATURE.every((b, i) => bytes[i] === b)

export function sanitizeSvg(text: string): CleanSvg | null {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const root = doc.documentElement
  if (!root || root.localName !== 'svg' || (root.namespaceURI !== SVG_NS && root.namespaceURI !== null)) return null
  if (doc.getElementsByTagName('parsererror').length > 0) return null
  const ns = root.namespaceURI
  const out = document.implementation.createDocument(SVG_NS, 'svg', null)
  const outRoot = out.documentElement
  const colors = new Set<string>()
  let shapes = 0

  const copyAttributes = (from: Element, to: Element): void => {
    for (const attr of Array.from(from.attributes)) {
      if (attr.namespaceURI !== null || !ATTRIBUTES.has(attr.name) || UNSAFE_VALUE.test(attr.value)) continue
      to.setAttribute(attr.name, attr.value)
    }
  }
  // fill et stroke se transmettent aux enfants : on suit la valeur effective pour juger « monochrome ».
  const walk = (from: Element, to: Element, fill: string, stroke: string): void => {
    for (const child of Array.from(from.children)) {
      if (child.namespaceURI !== ns || !ELEMENTS.has(child.localName)) continue
      const copy = out.createElementNS(SVG_NS, child.localName)
      if (child.localName === 'title' || child.localName === 'desc') {
        copy.textContent = child.textContent ?? ''
        to.appendChild(copy)
        continue
      }
      copyAttributes(child, copy)
      const f = copy.getAttribute('fill') ?? fill
      const s = copy.getAttribute('stroke') ?? stroke
      if (SHAPES.has(child.localName)) {
        shapes++
        for (const paint of [f, s]) {
          const c = normalizeColor(paint)
          if (!NO_PAINT.has(c)) colors.add(c)
        }
      } else walk(child, copy, f, s)
      to.appendChild(copy)
    }
  }

  copyAttributes(root, outRoot)
  const width = parseFloat(root.getAttribute('width') ?? '')
  const height = parseFloat(root.getAttribute('height') ?? '')
  if (!outRoot.hasAttribute('viewBox')) outRoot.setAttribute('viewBox', width > 0 && height > 0 ? `0 0 ${width} ${height}` : '0 0 24 24')
  outRoot.removeAttribute('width')
  outRoot.removeAttribute('height')
  walk(root, outRoot, outRoot.getAttribute('fill') ?? 'black', outRoot.getAttribute('stroke') ?? 'none')
  if (shapes === 0) return null
  return { svg: new XMLSerializer().serializeToString(out), monochrome: colors.size <= 1 }
}

export function importIconFile(_name: string, bytes: Uint8Array): IconImport {
  if (bytes.length > ICON_MAX_BYTES) return { ok: false, error: 'L’icône dépasse 256 Ko.' }
  if (isPng(bytes)) return { ok: true, icon: { kind: 'image', dataUri: `data:image/png;base64,${base64(bytes)}` } }
  const text = new TextDecoder('utf-8').decode(bytes)
  if (!/<svg[\s>]/i.test(text)) return { ok: false, error: 'Ce fichier n’est ni un SVG ni un PNG.' }
  const clean = sanitizeSvg(text)
  if (!clean) return { ok: false, error: 'Ce SVG ne contient aucune forme utilisable.' }
  const dataUri = `data:image/svg+xml;base64,${base64(new TextEncoder().encode(clean.svg))}`
  return { ok: true, icon: { kind: 'image', dataUri, ...(clean.monochrome ? { tint: true } : {}) } }
}
