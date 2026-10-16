import type { Messages } from '../messages'

export const model: Messages['model'] = {
  newProjectTitle: 'New project',
  dmxSource: { typed: 'typed' },
  dmx: {
    addressShort: 'Addr.',
    universeConflict: (p) => `Typed universe ${p.typed}; cable gives ${p.cable}`,
    overlap: (p) => `Overlaps ${p.name} (${p.range})`,
    overflow: 'Exceeds 512'
  },
  patchPanel: {
    frontRow: 'FRONT',
    backRow: 'BACK',
    port: (p) => `${p.n} ${p.side}`
  },
  family: {
    ethernet: 'RJ45',
    optical: 'SFP/SFP+',
    wifi: 'Wi-Fi',
    usb: 'USB',
    dmx: 'DMX',
    pixel: 'pixels',
    hdmi: 'HDMI',
    sdi: 'SDI',
    serial: 'serial',
    dc: 'DC power'
  },
  file: {
    notJson: 'Unreadable file: this is not valid JSON.',
    notProject: 'This file is not an AV·WAN project (schemaVersion missing).',
    invalid: (p) => `Invalid file: ${p.where}`,
    unexpectedStructure: 'unexpected structure',
    noMigration: (p) => `No migration from version ${p.version}`
  },
  unknownTemplate: (p) => `Unknown template: ${p.id}`,
  sanitize: {
    duplicateDevice: (p) => `Duplicate device ignored: ${p.name}.`,
    duplicateCable: (p) => `Duplicate cable ignored: ${p.label}.`,
    cableMissingEnd: (p) => `Cable ${p.label} ignored: it refers to a missing device or port.`,
    cableBlocked: (p) => `Cable ${p.label} ignored: port already in use or incompatible connectors.`
  },
  example: {
    title: 'Interactive installation (example)',
    authors: 'Technical team',
    zones: { control: 'Control room', hall: 'Hall', stage: 'Stage' },
    unknownDevice: (p) => `Unknown example device: ${p.key}`,
    models: {
      controlSwitch: 'Control room switch 24 PoE+',
      hallSwitch: 'Hall switch 8 PoE+',
      presenceSensor: 'Presence sensor',
      wirelessButton: 'Wireless button',
      pixelStrip: 'Pixel strip 5 m',
      movingFixture: 'Moving head fixture',
      stageStrip: 'Stage strip'
    }
  }
}
