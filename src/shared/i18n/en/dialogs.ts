import type { Messages } from '../messages'

export const dialogs: Messages['dialogs'] = {
  quitWithoutSaving: 'Quit without saving',
  unsavedMessage: 'You have unsaved changes.',
  unsavedDetail: 'They will be lost if you quit now.',
  aboutTitle: (p) => `About ${p.app}`,
  aboutVersion: (p) => `Version ${p.version}`,
  replace: 'Replace',
  replaceCsvMessage: 'Replace the existing CSV files?',
  projectFilter: 'AV·WAN project',
  filterPdf: 'PDF document',
  filterCsv: 'CSV files',
  filterXlsx: 'Excel workbook',
  defaultProjectName: 'New project',
  fallbackFileName: 'project',
  reservedSuffix: 'project'
}
