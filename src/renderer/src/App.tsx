import { APP_NAME, APP_SUBTITLE } from '../../shared/appInfo'

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: 32 }}>
      <h1>{APP_NAME}</h1>
      <p>{APP_SUBTITLE}</p>
    </main>
  )
}
