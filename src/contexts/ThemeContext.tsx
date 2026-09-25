import React, { createContext, startTransition, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

type ThemeMode = 'light' | 'dark'

interface ThemeContextType {
  theme: ThemeMode
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
})

/**
 * The theme itself is decided before first paint, by the inline script in
 * index.html, which puts `light` or `dark` on <html> from the saved choice or
 * the system setting. This provider only mirrors that class so the toggle can
 * show the right icon, and changes it when the visitor asks.
 *
 * It starts as 'light' on the server and on the first client render, because
 * prerendered HTML has to hydrate against identical markup; the real value is
 * read from <html> just after. That read is a transition, so React finishes
 * adopting the prerendered sections first: an ordinary update would reach
 * sections still being hydrated and make React redraw them from scratch. The
 * colours are right from first paint either way; only the toggle's icon waits.
 * A choice is saved only when the visitor makes one, so someone who never
 * touches the toggle keeps following their system setting.
 */
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>('light')
  const chosen = useRef(false)

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) startTransition(() => setTheme('dark'))
  }, [])

  useEffect(() => {
    if (!chosen.current) return
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      /* private mode or storage disabled: the choice lasts for this page only */
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    chosen.current = true
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }, [])

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}
