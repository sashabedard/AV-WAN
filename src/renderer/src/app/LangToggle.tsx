import type { Lang } from '../../../shared/i18n/lang'
import { Segmented } from '../panels/Segmented'
import { uiStore } from '../store/uiStore'
import { useT } from '../i18n/useT'

const OPTIONS = [
  { value: 'fr', label: 'FR' },
  { value: 'en', label: 'EN' }
] as const satisfies ReadonlyArray<{ value: Lang; label: string }>

// Bouton FR | EN (spec plan 6 § 4.3) : le main enregistre le choix et le renvoie à toutes les fenêtres.
export function LangToggle() {
  const { m, lang } = useT()
  const choose = (next: Lang): void => {
    if (window.avwan?.settings?.setLang) void window.avwan.settings.setLang(next)
    else uiStore.getState().setLang(next)
  }
  return <Segmented options={OPTIONS} value={lang} onChange={choose} ariaLabel={m.topbar.langGroup} />
}
