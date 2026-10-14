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
}
export interface Facade {
  width: number
  height: number
  ports: FacadePort[]
  twoRows: boolean
}

const EAR = 12
const PAD_LEFT = 28
const PITCH = 20
const RJ_W = 14
const RJ_H = 12
const SFP_W = 18
const SFP_H = 10
const SFP_PITCH = 22
const GAP_BEFORE_SFP = 14
const PAD_RIGHT = 22

export function switchFacade(ports: PortDef[]): Facade {
  const rj = ports.filter((p) => p.connector === 'rj45')
  const sfp = ports.filter((p) => p.connector !== 'rj45')
  const twoRows = rj.some((p) => p.row === 'top')
  const rowY = twoRows ? { top: 40, bottom: 62 } : { top: 34, bottom: 34 }
  const cols = twoRows ? Math.ceil(rj.length / 2) : rj.length
  const sfpCols = twoRows ? Math.ceil(sfp.length / 2) : sfp.length
  const out: FacadePort[] = []
  rj.forEach((p, i) => {
    const col = twoRows ? Math.floor(i / 2) : i
    const row = p.row === 'top' ? 'top' : 'bottom'
    out.push({ id: p.id, label: p.label, kind: 'rj45', x: EAR + PAD_LEFT + col * PITCH, y: rowY[row], w: RJ_W, h: RJ_H, row })
  })
  const sfpX0 = EAR + PAD_LEFT + cols * PITCH + (sfp.length > 0 ? GAP_BEFORE_SFP : 0)
  sfp.forEach((p, i) => {
    const col = twoRows ? Math.floor(i / 2) : i
    const row = p.row === 'top' ? 'top' : 'bottom'
    out.push({ id: p.id, label: p.label, kind: 'sfp+', x: sfpX0 + col * SFP_PITCH, y: rowY[row] + 1, w: SFP_W, h: SFP_H, row })
  })
  return { width: sfpX0 + sfpCols * SFP_PITCH + PAD_RIGHT + EAR, height: twoRows ? 92 : 66, ports: out, twoRows }
}
