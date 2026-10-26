import type { Connector, Medium } from '../model/types'
import type { PoeChoice } from '../model/customTemplate'
import type { Family } from '../model/rules'
import type { Messages } from '../../../shared/i18n/messages'

export function mediumLabel(medium: Medium, m: Messages): string {
  return m.catalog.media[medium]
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
  dc: ['dc'],
  displayport: ['displayport']
}

export function mediaForFamily(family: Family): Medium[] {
  return MEDIA_BY_FAMILY[family]
}

export function connectorLabel(connector: Connector, m: Messages): string {
  return m.catalog.connectors[connector]
}

export const POE_CHOICE_IDS: readonly PoeChoice[] = ['none', 'in-af', 'in-at', 'in-bt', 'out-af', 'out-at', 'out-bt']

export function poeChoiceLabel(choice: PoeChoice, m: Messages): string {
  return m.catalog.poeChoices[choice]
}
