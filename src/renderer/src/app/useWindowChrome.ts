import { useEffect, type RefObject } from 'react'

// Fenêtre sans barre de titre native (main/windowChrome.ts) : la barre de l'app accueille les contrôles du système.
// Sans API (tests de composants), rien ne se passe.
export function useWindowChrome(bar: RefObject<HTMLElement | null>): void {
  const platform = window.avwan?.platform
  const api = window.avwan?.window

  // <html data-platform> règle les marges (pastilles macOS à gauche, boutons Windows à droite).
  useEffect(() => {
    if (!platform) return
    const root = document.documentElement
    root.dataset['platform'] = platform
    if (!api) return
    // Plein écran macOS : les pastilles disparaissent, la barre récupère leur place.
    return api.onFullscreen((on) => {
      if (on) root.dataset['fullscreen'] = ''
      else delete root.dataset['fullscreen']
    })
  }, [platform, api])

  // Windows : les boutons natifs prennent le fond et la couleur du texte de la barre, à chaque thème
  // (bascule de l'app : data-theme sur <html> ; thème du système : prefers-color-scheme).
  useEffect(() => {
    const el = bar.current
    if (!api || !platform || platform === 'darwin' || !el) return
    const send = (): void => {
      const style = getComputedStyle(el)
      api.setTitleBarColors({ color: style.backgroundColor, symbolColor: style.color })
    }
    send()
    const observer = new MutationObserver(send)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', send)
    return () => {
      observer.disconnect()
      mq.removeEventListener('change', send)
    }
  }, [api, platform, bar])
}
