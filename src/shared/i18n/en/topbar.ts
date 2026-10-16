import type { Messages } from '../messages'

export const topbar: Messages['topbar'] = {
  langGroup: (p: { name: string }) => `Language: ${p.name}`,
  menu: 'Menu',
  menuTitle: 'File, Edit, View, Help',
  unsaved: 'Unsaved changes',
  readOnly: 'Read-only',
  view: 'View',
  viewSchema: 'Diagram',
  viewRacks: 'Racks',
  export: 'Export',
  exportTitle: 'Export the PDF, CSV or Excel workbook (⌘E)'
}
