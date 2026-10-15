import type { Connector, Medium } from '../model/types'
import type { PoeChoice } from '../model/customTemplate'
import type { Family } from '../model/rules'

export const MEDIUM_LABELS: Record<Medium, string> = {
  cat5e: 'Cat5e', cat6: 'Cat6', cat6a: 'Cat6A', om3: 'Fibre OM3', om4: 'Fibre OM4', os2: 'Fibre OS2', dac: 'DAC',
  wifi: 'Wi-Fi', usb: 'USB', dmx: 'DMX', pixel: 'Pixels', hdmi: 'HDMI', sdi: 'SDI', serial: 'Série', dc: 'Alim DC'
}

const MEDIA_BY_FAMILY: Record<Family, Medium[]> = {
  ethernet: ['cat5e', 'cat6', 'cat6a'],
  optical: ['om3', 'om4', 'os2', 'dac'],
  wifi: ['wifi'],
  usb: ['usb'],
  dmx: ['dmx'],
  pixel: ['pixel'],
  hdmi: ['hdmi'],
  sdi: ['sdi'],
  serial: ['serial'],
  dc: ['dc']
}

export function mediaForFamily(family: Family): Medium[] {
  return MEDIA_BY_FAMILY[family]
}

export const CONNECTOR_LABELS: Record<Connector, string> = {
  rj45: 'RJ45',
  sfp: 'SFP',
  'sfp+': 'SFP+',
  wifi: 'Wi-Fi',
  usb: 'USB',
  dmx: 'DMX',
  pixel: 'Pixels',
  hdmi: 'HDMI',
  sdi: 'SDI',
  serial: 'Série',
  dc: 'Alim DC'
}

export const POE_CHOICE_LABELS: Record<PoeChoice, string> = {
  none: 'Aucun',
  'in-af': 'Reçoit PoE (af)',
  'in-at': 'Reçoit PoE+ (at)',
  'in-bt': 'Reçoit PoE++ (bt)',
  'out-af': 'Fournit PoE (af)',
  'out-at': 'Fournit PoE+ (at)',
  'out-bt': 'Fournit PoE++ (bt)'
}
