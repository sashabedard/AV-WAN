// Electron préfixe les rejets IPC : « Error invoking remote method 'file:open': Error: … ». On garde le message.
export function ipcErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  return raw.replace(/^Error invoking remote method '[^']*':\s*/, '').replace(/^[A-Za-z]*Error:\s*/, '')
}
