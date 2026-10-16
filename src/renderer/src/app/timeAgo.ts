// « il y a 3 min » : pour le bandeau de récupération et la question à l'ouverture.
import { currentMessages } from '../i18n/useT'
import type { Messages } from '../../../shared/i18n/messages'

export function timeAgo(iso: string, now: number = Date.now(), m: Messages = currentMessages()): string {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (seconds < 60) return m.app.ago.seconds
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return m.app.ago.minutes({ n: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return m.app.ago.hours({ n: hours })
  return m.app.ago.days({ n: Math.round(hours / 24) })
}
