import { useEffect, useState } from 'react'

const KEY = 'singha-parking-theme'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(KEY) || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(KEY, theme)
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  return { theme, toggle }
}
