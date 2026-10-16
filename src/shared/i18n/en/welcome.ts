import type { Messages } from '../messages'

export const welcome: Messages['welcome'] = {
  title: 'Welcome',
  tagline: 'Plan. Patch. Document.',
  newProject: 'New project',
  exampleProject: 'Example project: interactive installation',
  open: 'Open…',
  recent: 'Recent files',
  pun: 'May the network be with you.',
  recovery: {
    title: 'Unsaved work',
    restore: 'Restore',
    ignore: 'Dismiss',
    restoreLabel: (p) => `Restore ${p.name}`,
    ignoreLabel: (p) => `Dismiss ${p.name}`
  }
}
