import { createContext, useContext, useMemo, useState, useCallback } from 'react'
import en from '../i18n/en.js'
import es from '../i18n/es.js'
import { readStored, writeStored } from './safeStorage.js'

const DICTS = { en, es }
const KEY = 'lca.lang'
const I18nContext = createContext(null)

function detectLanguage() {
  const stored = readStored(KEY)
  if (stored === 'en' || stored === 'es') return stored
  try {
    const nav = (window.navigator.languages || [window.navigator.language] || [])
      .filter(Boolean)
      .map((l) => String(l).toLowerCase())
    if (nav.some((l) => l.startsWith('es'))) return 'es'
  } catch { /* fall through */ }
  return 'en'
}

/** Looks a dotted key up in the active dictionary, falling back to English. */
export function lookup(lang, key) {
  const parts = String(key).split('.')
  for (const dict of [DICTS[lang], DICTS.en]) {
    let node = dict
    let ok = true
    for (const p of parts) {
      if (node && typeof node === 'object' && p in node) node = node[p]
      else { ok = false; break }
    }
    if (ok && node !== undefined) return node
  }
  return key
}

export function interpolate(text, vars) {
  if (typeof text !== 'string' || !vars) return text
  return text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m))
}

/** Standalone translator, for modules outside React (exports, template). */
export function makeT(lang) {
  return (key, vars) => interpolate(lookup(lang, key), vars)
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLanguage)

  const setLang = useCallback((next) => {
    setLangState(next)
    writeStored(KEY, next)
    try { document.documentElement.lang = next === 'es' ? 'es-ES' : 'en-GB' } catch { /* ignore */ }
  }, [])

  const value = useMemo(() => ({
    lang,
    setLang,
    t: makeT(lang),
    list: (key) => lookup(lang, key),
  }), [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
