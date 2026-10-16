import type { Selection } from '../store/projectStore'

// Vue épinglée (spec 2026-10-14) : calculs purs du cadre épinglé, de la boîte flottante et du clic.

// Cadre épinglé, en coordonnées du schéma (comme le rectangle d'une zone).
export interface PinnedRect {
  x: number
  y: number
  w: number
  h: number
}
// Boîte de la vignette, en pixels, relative au canvas.
export interface Box {
  left: number
  top: number
  width: number
  height: number
}
export interface Size {
  width: number
  height: number
}
export interface PinnedTarget {
  kind: 'device' | 'link' | 'zone'
  id: string
}

export const VIGNETTE_DEFAULT: Size = { width: 320, height: 200 }
export const VIGNETTE_MIN: Size = { width: 200, height: 130 }
export const VIGNETTE_MAX_RATIO = 0.6
export const VIGNETTE_MARGIN = 12

// Rectangle visible du canvas principal (sa taille en pixels), en coordonnées du schéma.
export function visibleFlowRect(viewport: { x: number; y: number; zoom: number }, size: Size): PinnedRect {
  // « + 0 » : une vue sans décalage donne 0, pas -0.
  return { x: -viewport.x / viewport.zoom + 0, y: -viewport.y / viewport.zoom + 0, w: size.width / viewport.zoom, h: size.height / viewport.zoom }
}

const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max)

// Taille entre le minimum et 60 % du canvas (le minimum l'emporte dans un canvas minuscule), puis
// position ramenée dans le canvas.
export function clampVignette(box: Box, canvas: Size): Box {
  const width = clamp(box.width, VIGNETTE_MIN.width, Math.max(VIGNETTE_MIN.width, canvas.width * VIGNETTE_MAX_RATIO))
  const height = clamp(box.height, VIGNETTE_MIN.height, Math.max(VIGNETTE_MIN.height, canvas.height * VIGNETTE_MAX_RATIO))
  return {
    left: clamp(box.left, 0, Math.max(0, canvas.width - width)),
    top: clamp(box.top, 0, Math.max(0, canvas.height - height)),
    width,
    height
  }
}

// Première place de la vignette : coin haut-droit (la légende est en bas à droite, la minicarte en bas à gauche).
export function defaultPlacement(canvas: Size): Box {
  const { width, height } = clampVignette({ left: 0, top: 0, ...VIGNETTE_DEFAULT }, canvas)
  return clampVignette({ left: canvas.width - width - VIGNETTE_MARGIN, top: VIGNETTE_MARGIN, width, height }, canvas)
}

// Clic dans la vignette, comme dans le canvas principal : remplace la sélection ou, avec Shift, ⌘ ou Ctrl,
// ajoute l'élément ou le retire.
export function clickSelection(current: Selection, target: PinnedTarget, additive: boolean): Selection {
  const base: Required<Omit<Selection, 'rackIds'>> = additive
    ? { deviceIds: current.deviceIds, linkIds: current.linkIds, zoneIds: current.zoneIds ?? [] }
    : { deviceIds: [], linkIds: [], zoneIds: [] }
  const toggle = (ids: string[]): string[] =>
    !additive ? [target.id] : ids.includes(target.id) ? ids.filter((id) => id !== target.id) : [...ids, target.id]
  switch (target.kind) {
    case 'device':
      return { ...base, deviceIds: toggle(base.deviceIds) }
    case 'link':
      return { ...base, linkIds: toggle(base.linkIds) }
    case 'zone':
      return { ...base, zoneIds: toggle(base.zoneIds) }
  }
}
