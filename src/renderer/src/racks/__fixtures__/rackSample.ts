import type { Project } from '../../model/types'
import { sampleProject } from '../../model/__fixtures__/sample'

// Jeu d'essai de la vue de baie : SW-1 (switch 4 ports) en U1 et MAC-1 (générique 2U) en U3 de BAIE-1 (12U) ;
// CAM-1 reste hors baie. Câbles : SW-1:1 ⇄ CAM-1:ETH (l1, sort de la baie) et SW-1:2 ⇄ MAC-1:ETH (l2, dans la baie).
export function rackSample(): Project {
  const p = sampleProject()
  return {
    ...p,
    zones: [{ id: 'z1', name: 'Régie', color: '#3E8EF7', rect: { x: -40, y: -40, w: 600, h: 400 }, ownPdfPage: false }],
    racks: [{ id: 'r1', name: 'BAIE-1', heightU: 12, zoneId: 'z1' }],
    devices: [
      { ...p.devices[0]!, rack: { rackId: 'r1', u: 1, heightU: 1 } },
      p.devices[1]!,
      {
        id: 'mac',
        templateId: 'show-mac',
        name: 'MAC-1',
        position: { x: 320, y: 0 },
        portSide: 'auto',
        ports: [
          { id: 'ETH', label: 'ETH', connector: 'rj45', speedMbps: 1000 },
          { id: 'USB1', label: 'USB1', connector: 'usb' }
        ],
        portState: {},
        rack: { rackId: 'r1', u: 3, heightU: 2 }
      }
    ],
    links: [
      ...p.links,
      { id: 'l2', cableId: 'C-002', a: { deviceId: 'sw1', portId: '2' }, b: { deviceId: 'mac', portId: 'ETH' }, medium: 'cat6', lengthM: 1 }
    ]
  }
}
