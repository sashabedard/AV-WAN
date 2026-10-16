import type { Messages } from '../messages'

export const palette: Messages['palette'] = {
  navLabel: 'Device palette',
  filterLabel: 'Filter devices',
  filterPlaceholder: 'Filter…',
  itemTitle: 'Drag onto the canvas, or click then click on the canvas',
  zoneTool: 'Zone',
  zoneToolTitle: 'Click then click on the canvas · ⌘G: a zone around the selection',
  resultsLabel: 'Filter results',
  noMatch: 'No matching device.',
  mine: 'My components',
  newComponent: 'New component',
  mineHint: 'Create your own devices with +.',
  thisProject: 'This project',
  addToLibrary: (p) => `Add ${p.name} to my library`,
  addToLibraryTitle: 'Add to my library',
  actionsFor: (p) => `Actions for ${p.name}`,
  edit: 'Edit',
  duplicate: 'Duplicate',
  remove: 'Delete',
  confirmRemove: (p) => `Delete "${p.name}" from your library? Projects that use it keep it.`,
  duplicateFailed: (p) => `Could not duplicate: ${p.detail}`,
  removeFailed: (p) => `Could not delete: ${p.detail}`,
  addFailed: (p) => `Could not add: ${p.detail}`
}
