import { expect, test } from '@playwright/test'

test('entrada sem configuração, quatro temas, celular e foco por teclado', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Conexão indisponível' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar com Google' })).toHaveCount(0)
  for (const palette of ['petroleo', 'brasa']) {
    for (const theme of ['light', 'dark']) {
      await page.getByLabel('Paleta').selectOption(palette)
      await page.getByLabel('Tema', { exact: true }).selectOption(theme)
      await expect(page.locator('html')).toHaveAttribute('data-palette', palette)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      const colors = await page.evaluate(() => {
        const css = getComputedStyle(document.documentElement)
        return ['text-primary', 'text-secondary', 'text-on-primary', 'action-primary', 'action-hover', 'surface', 'surface-raised', 'border-control', 'success', 'warning', 'danger'].map(token => css.getPropertyValue(`--${token}`).trim())
      })
      const [primary, secondary, onAction, action, hover, surface, raised, border, success, warning, danger] = colors
      for (const text of [primary, secondary, success, warning, danger]) expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(onAction, action)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(onAction, hover)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(danger, raised)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(border, surface)).toBeGreaterThanOrEqual(3)
    }
  }
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'brasa')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused()
  await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 900 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.evaluate(() => { document.body.style.zoom = '2' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.evaluate(() => { document.body.style.zoom = '1' })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await page.locator('select').first().evaluate(node => getComputedStyle(node).transitionDuration)).toBe('0s')
})

function contrast(a: string, b: string) {
  function luminance(hex: string) {
    const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
      .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
    return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2]
  }
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y)
  return (high + .05) / (low + .05)
}

test('fixture: CRUD móvel, confirmação nativa e cancelamento por teclado', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/tests/browser/fixture.html')
  const name = page.getByLabel('Nome (obrigatório)')
  const anchors = page.getByLabel('Palavras âncora (obrigatórias)')
  await name.fill('Contexto fictício de revisão com título longo e acentos')
  await anchors.fill('leitura, estudo, revisão')
  await page.getByRole('button', { name: 'Salvar ambiente' }).click()
  await expect(page.getByRole('status')).toHaveText('Ambiente salvo.')
  await page.getByRole('button', { name: /^Editar / }).click()
  await anchors.fill('uma, duas')
  await page.getByRole('button', { name: 'Salvar ambiente' }).click()
  await expect(anchors).toHaveAttribute('aria-invalid', 'true')
  await anchors.fill('leitura, estudo, trabalho')
  await page.getByRole('button', { name: 'Salvar ambiente' }).click()
  await expect(page.getByText('leitura · estudo · trabalho')).toBeVisible()
  await page.getByRole('button', { name: /^Excluir / }).click()
  const dialog = page.getByRole('dialog', { name: 'Excluir ambiente?' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Itens afetados: nenhum.')
  await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('button', { name: /^Excluir / })).toBeVisible()
  await page.getByRole('button', { name: /^Excluir / }).click()
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click()
  await expect(page.getByText('Nenhum ambiente criado. Comece pelo formulário.')).toBeVisible()
  await expect(name).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
