import { createContext, useContext, useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import './themes.css'

export const THEMES = [
  { id: 'classic', name: 'FitCore Blue', description: 'The original. Crisp & focused.', colors: ['#f4f6fa', '#ffffff', '#2453ee'] },
  { id: 'volt', name: 'Midnight Volt', description: 'Black canvas. Electric lime.', colors: ['#101310', '#1c211b', '#d5f66b'] },
  { id: 'rose', name: 'Rose Studio', description: 'Soft rose. Confident pink.', colors: ['#fcf5f8', '#ffffff', '#b52062'] },
  { id: 'dream', name: 'Daydream', description: 'Airy lavender. A calmer rhythm.', colors: ['#f6f4fc', '#ffffff', '#7151bd'] },
  { id: 'ocean', name: 'Deep Ocean', description: 'Dark blue. Fresh aqua.', colors: ['#0e1924', '#182938', '#75dece'] },
] as const
export type ThemeId = typeof THEMES[number]['id']
const ThemeContext = createContext<{ theme: ThemeId; setTheme: (id: ThemeId) => void }>({ theme: 'classic', setTheme: () => {} })
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(() => { try { const saved = localStorage.getItem('fitcore-theme'); return THEMES.find(item => item.id === saved)?.id ?? 'classic' } catch { return 'classic' } })
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme === 'volt' || theme === 'ocean' ? 'dark' : 'light'
    try { localStorage.setItem('fitcore-theme', theme) } catch { /* Theme still works without persistence. */ }
  }, [theme])
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
export const useTheme = () => useContext(ThemeContext)
