import type { PortDef, SwitchSpec } from '../model/types'
import type { Messages } from '../../../shared/i18n/messages'

export const SWITCH_PORT_COUNTS = [4, 5, 8, 12, 16, 24, 48] as const
export const DEFAULT_SWITCH_SPEC: SwitchSpec = { portCount: 8, poe: 'at', sfpPlus: 2, managed: true }

export function poeSpecLabel(poe: SwitchSpec['poe'], m: Messages): string {
  return m.catalog.poeSpec[poe]
}
export function poeChoices(m: Messages): Array<{ value: SwitchSpec['poe']; label: string }> {
  return (['none', 'af', 'at', 'bt'] as const).map((value) => ({ value, label: poeSpecLabel(value, m) }))
}

// Budgets indicatifs (spec § 7.1). Colonnes : 4–5, 8, 12–16, 24, 48 ports.
const BUDGETS: Record<'af' | 'at' | 'bt', readonly [number, number, number, number, number]> = {
  af: [30, 60, 120, 190, 370],
  at: [60, 120, 180, 400, 600],
  bt: [120, 240, 360, 720, 1000]
}

function sizeIndex(count: SwitchSpec['portCount']): 0 | 1 | 2 | 3 | 4 {
  if (count <= 5) return 0
  if (count === 8) return 1
  if (count <= 16) return 2
  if (count === 24) return 3
  return 4
}

export function defaultPoeBudget(count: SwitchSpec['portCount'], poe: SwitchSpec['poe']): number | undefined {
  if (poe === 'none') return undefined
  return BUDGETS[poe][sizeIndex(count)]
}

export function isTwoRows(count: number): boolean {
  return count > 16
}

export function buildSwitchPorts(spec: SwitchSpec): PortDef[] {
  const twoRows = isTwoRows(spec.portCount)
  const rowOf = (n: number): 'top' | 'bottom' => (twoRows && n % 2 === 1 ? 'top' : 'bottom')
  const ports: PortDef[] = []
  for (let i = 1; i <= spec.portCount; i++) {
    ports.push({
      id: String(i),
      label: String(i),
      connector: 'rj45',
      speedMbps: 1000,
      ...(spec.poe !== 'none' ? { poeOut: spec.poe } : {}),
      row: rowOf(i)
    })
  }
  for (let i = 1; i <= spec.sfpPlus; i++) {
    ports.push({ id: `SFP+${i}`, label: `S${i}`, connector: 'sfp+', speedMbps: 10000, row: rowOf(i) })
  }
  return ports
}

export function switchSummary(spec: SwitchSpec, m: Messages): string {
  const main = spec.poe === 'none' ? m.catalog.switchPorts({ n: spec.portCount }) : `${spec.portCount}×${poeSpecLabel(spec.poe, m)}`
  return spec.sfpPlus > 0 ? `${main} · ${spec.sfpPlus}×SFP+` : main
}
