// Browser storage is optional: every read and write is wrapped, and the app
// renders correctly when it is unavailable (private window, blocked site data).
export function readStored(key) {
  try { return window.localStorage.getItem(key) } catch { return null }
}
export function writeStored(key, value) {
  try { window.localStorage.setItem(key, value) } catch { /* ignore */ }
}
