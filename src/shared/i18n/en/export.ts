import type { Messages } from '../messages'
import { enPlural } from '../plural'

export const exportMessages: Messages['export'] = {
  sections: {
    schema: 'Diagram',
    appareils: 'Device sheets',
    ports: 'Port map per switch',
    branchement: 'Cabling schedule',
    vlans: 'VLAN sheets',
    ip: 'IP addressing plan',
    patch: 'DMX patch',
    canaux: 'DMX channels',
    puissance: 'Power budget',
    nomenclature: 'Bill of materials',
    baies: 'Rack elevations',
    'baies-cables': 'Rack elevations with cables'
  },
  formats: { na: 'Tabloid 11×17 + Letter', iso: 'A3 + A4' },
  dialog: {
    title: 'Export PDF',
    sections: 'Sections',
    zonePages: (p) => `Enlarged zone pages (${p.n})`,
    format: 'Format',
    formatAria: 'Page format',
    noRacks: 'No rack in the project: these two sections are unavailable.',
    docLang: 'Document language',
    lists: 'Lists (cabling, IP plan, bill of materials)',
    csv: 'CSV…',
    xlsx: 'Excel…',
    submit: 'Export PDF…'
  },
  toast: {
    preparing: 'Preparing the PDF…',
    pdfExported: (p) => `PDF exported: ${p.name}`,
    pdfFailed: (p) => `PDF export failed: ${p.reason}`,
    csvExported: (p) => `${p.n} CSV file${enPlural(p.n, '', 's')} exported: ${p.names}`,
    csvFailed: (p) => `CSV export failed: ${p.reason}`,
    xlsxExported: (p) => `Excel workbook exported: ${p.name}`,
    xlsxFailed: (p) => `Excel export failed: ${p.reason}`
  }
}
