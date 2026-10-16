import type { Messages } from '../messages'

export const update: Messages['update'] = {
  notPackaged: 'Updates are only checked in the installed app.',
  store: 'AV·WAN updates come from the Microsoft Store.',
  storeDetail: 'Microsoft Store › Library › Get updates.',
  upToDate: (p) => `AV·WAN is up to date (${p.current}).`,
  downloading: (p) => `Version ${p.version} is downloading.`,
  downloadingDetail: 'A banner will offer to restart when it is ready.',
  ready: (p) => `Version ${p.version} is ready.`,
  readyDetail: 'Restart AV·WAN to install it.',
  checkFailed: 'Could not check for updates.',
  offline: 'No Internet connection, or GitHub is unreachable.',
  noRelease: 'No published release was found.',
  rateLimited: 'GitHub is temporarily limiting update checks. Try again later.',
  unexpected: (p) => `Unexpected error from the update service. (${p.reason})`
}
