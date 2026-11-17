import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { readStored, writeStored } from './safeStorage.js'

const KEY = 'lca.theme'
const ThemeContext = createContext(null)

function detectTheme() {
  const stored = readStored(KEY)
  if (stored === 'light' || stored === 'dark') return stored
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch { /* fall through */ }
  return 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(detectTheme)

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme)
      document.documentElement.style.colorScheme = theme
    } catch { /* ignore */ }
  }, [theme])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    writeStored(KEY, next)
  }, [])

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    isDark: theme === 'dark',
  }), [theme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
