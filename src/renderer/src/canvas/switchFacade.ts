import type { PortDef } from '../model/types'

export interface FacadePort {
  id: string
  label: string
  kind: 'rj45' | 'sfp+'
  x: number
  y: number
  w: number
  h: number
  row: 'top' | 'bottom'
  number?: string // texte du numéro dessiné sous / au-dessus de la prise ; absent = pas de numéro
}
// Trait d'état entre la prise avant et la prise arrière d'une même position de panneau.
export interface PanelTie {
  position: number
  front: string
  back: string
  x: number
  y1: number
  y2: number
}
export interface Facade {
  width: number
  height: number
  ports: FacadePort[]
  twoRows: boolean
  ties?: PanelTie[]
  rowLabelX?: number
}

const EAR = 12
const PAD_LEFT = 28
// Panneau : marge élargie pour « ARRIÈRE » (7 caractères, police 6,5 px ≈ 3,9 px par caractère) à gauche des prises.
const PANEL_PAD_LEFT = 46
const ROW_LABEL_X = EAR + 6
const PITCH = 20
const RJ_W = 14
const RJ_H = 12
const SFP_W = 18
const SFP_H = 10
const SFP_PITCH = 22
const GAP_BEFORE_SFP = 14
const PAD_RIGHT = 22

type Row = 'top' | 'bottom'

const optNumber = (n: string | undefined): { number?: string } => (n === undefined ? {} : { number: n })

// Façade de rack (switch ou panneau de brassage). La colonne d'un port est son rang dans sa
// rangée : 1/2, 3/4… pour un switch à deux rangées ; A1/R1, A2/R2… pour un panneau.
export function switchFacade(ports: PortDef[], opts: { patchPanel?: boolean } = {}): Facade {
  const panel = opts.patchPanel === true
  const padLeft = panel ? PANEL_PAD_LEFT : PAD_LEFT
  const rj = ports.filter((p) => p.connector === 'rj45')
  const sfp = ports.filter((p) => p.connector !== 'rj45')
  const twoRows = rj.some((p) => p.row === 'top')
  const rowY = twoRows ? { top: 40, bottom: 62 } : { top: 34, bottom: 34 }
  const rowOf = (p: PortDef): Row => (twoRows && p.row === 'top' ? 'top' : 'bottom')
  const columns = (list: PortDef[]): Array<{ p: PortDef; row: Row; col: number }> => {
    const next = { top: 0, bottom: 0 }
    return list.map((p) => {
      const row = rowOf(p)
      return { p, row, col: next[row]++ }
    })
  }
  const rjCols = columns(rj)
  const sfpColsList = columns(sfp)
  const cols = Math.max(0, ...rjCols.map((c) => c.col + 1))
  const sfpCols = Math.max(0, ...sfpColsList.map((c) => c.col + 1))
  const numberOf = (p: PortDef): string | undefined => {
    if (!panel) return p.label
    const front = /^A(\d+)$/.exec(p.id)
    return front ? front[1] : undefined
  }
  const out: FacadePort[] = rjCols.map(({ p, row, col }) => ({ id: p.id, label: p.label, ...optNumber(numberOf(p)), kind: 'rj45', x: EAR + padLeft + col * PITCH, y: rowY[row], w: RJ_W, h: RJ_H, row }))
  const sfpX0 = EAR + padLeft + cols * PITCH + (sfp.length > 0 ? GAP_BEFORE_SFP : 0)
  for (const { p, row, col } of sfpColsList) {
    out.push({ id: p.id, label: p.label, ...optNumber(numberOf(p)), kind: 'sfp+', x: sfpX0 + col * SFP_PITCH, y: rowY[row] + 1, w: SFP_W, h: SFP_H, row })
  }
  const facade: Facade = { width: sfpX0 + sfpCols * SFP_PITCH + PAD_RIGHT + EAR, height: twoRows ? 92 : 66, ports: out, twoRows }
  if (panel) {
    const ties: PanelTie[] = []
    for (const f of out) {
      const m = /^A(\d+)$/.exec(f.id)
      const back = m && out.find((q) => q.id === `R${m[1]}`)
      if (m && back) ties.push({ position: Number(m[1]), front: f.id, back: back.id, x: f.x + f.w / 2, y1: f.y + f.h, y2: back.y })
    }
    facade.ties = ties
    facade.rowLabelX = ROW_LABEL_X
  }
  return facade
}

// Distance entre la poignée d'un port (bord du port tourné vers la sortie du cordon) et le bord extérieur de la façade.
export function facadeExit(facade: Facade, port: FacadePort): number {
  return facade.twoRows && port.row === 'top' ? port.y : facade.height - (port.y + port.h)
}

export const TAPE_X = 20
export const TAPE_CHAR_W = 5.8 // IBM Plex Mono 600 à 9,5 px
export const POE_CHAR_W = 5.1 // IBM Plex Mono 500 à 8,5 px
const TAPE_PAD = 12

export interface FacadeLabels {
  tape: string
  tapeWidth: number
  poe?: string
}

const labels = (tape: string, poe: string | undefined): FacadeLabels => ({ tape, tapeWidth: tape.length * TAPE_CHAR_W + TAPE_PAD, ...(poe ? { poe } : {}) })

// Étiquette ruban et indicateur PoE sur la même ligne, sans jamais se chevaucher (report du plan 1).
// Ordre de préférence : titre complet, avec l'indicateur long puis court ; nom seul, idem ; nom tronqué.
export function facadeLabels(name: string, summary: string, facadeWidth: number, poe?: { usedW: number; budgetW: number }): FacadeLabels {
  const full = summary ? `${name} · ${summary}` : name
  const long = poe ? `PoE ${poe.usedW} / ${poe.budgetW} W` : undefined
  const short = poe ? `${poe.usedW}/${poe.budgetW} W` : undefined
  const fit = (poeText: string | undefined): number =>
    Math.floor((facadeWidth - PAD_RIGHT - (poeText ? poeText.length * POE_CHAR_W + 10 : 0) - TAPE_X - TAPE_PAD) / TAPE_CHAR_W)
  const candidates: Array<[string, string | undefined]> = [
    [full, long],
    [full, short],
    [name, long],
    [name, short]
  ]
  for (const [text, poeText] of candidates) if (text.length <= fit(poeText)) return labels(text, poeText)
  const max = Math.max(2, fit(short))
  return labels(`${name.slice(0, max - 1)}…`, short)
}
