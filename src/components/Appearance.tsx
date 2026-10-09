import { useState } from 'react'

type AppearanceValue = { palette: 'petroleo' | 'brasa'; theme: 'light' | 'dark' }

function initialAppearance(): AppearanceValue {
  try {
    const saved = JSON.parse(localStorage.getItem('allgenda-appearance') ?? 'null') as AppearanceValue | null
    if (saved && ['petroleo', 'brasa'].includes(saved.palette) && ['light', 'dark'].includes(saved.theme)) return saved
  } catch { /* Armazenamento opcional: tema continua disponível. */ }
  return { palette: 'petroleo', theme: window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' }
}

export function Appearance() {
  const [value, setValue] = useState(() => {
    const initial = initialAppearance()
    document.documentElement.dataset.palette = initial.palette
    document.documentElement.dataset.theme = initial.theme
    return initial
  })
  function change(next: AppearanceValue) {
    setValue(next)
    document.documentElement.dataset.palette = next.palette
    document.documentElement.dataset.theme = next.theme
    try { localStorage.setItem('allgenda-appearance', JSON.stringify(next)) } catch { /* Sem persistência neste dispositivo. */ }
  }
  return <div className="appearance">
    <div><label htmlFor="appearance-palette">Paleta</label><select id="appearance-palette" value={value.palette} onChange={event => change({ ...value, palette: event.target.value as AppearanceValue['palette'] })}>
      <option value="petroleo">P3 · Petróleo e areia</option><option value="brasa">Original · Brasa</option>
    </select></div>
    <div><label htmlFor="appearance-theme">Tema</label><select id="appearance-theme" value={value.theme} onChange={event => change({ ...value, theme: event.target.value as AppearanceValue['theme'] })}>
      <option value="light">Claro</option><option value="dark">Escuro</option>
    </select></div>
  </div>
}
