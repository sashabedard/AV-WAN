// Largeur du panneau de gauche : réglage de l'app (localStorage, comme le thème), jamais dans le document.
type WidthStorage = Pick<Storage, 'getItem' | 'setItem'>

export const SIDEBAR_WIDTH_KEY = 'avwan.sidebarWidth'
export const SIDEBAR_DEFAULT = 232
export const SIDEBAR_MIN = 200
// Assez large pour le plus long nom du catalogue (« Convertisseur Blackmagic… BiDirectional SDI/HDMI 3G »).
export const SIDEBAR_MAX = 560

export function clampSidebarWidth(w: number): number {
  return Number.isFinite(w) ? Math.round(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w))) : SIDEBAR_DEFAULT
}

export function loadSidebarWidth(storage: WidthStorage | null): number {
  try {
    const v = storage?.getItem(SIDEBAR_WIDTH_KEY)
    return v ? clampSidebarWidth(Number(v)) : SIDEBAR_DEFAULT
  } catch {
    return SIDEBAR_DEFAULT
  }
}

export function saveSidebarWidth(w: number, storage: WidthStorage | null): void {
  try {
    storage?.setItem(SIDEBAR_WIDTH_KEY, String(w))
  } catch {
    // Stockage indisponible : la largeur ne vaut que pour la session.
  }
}
