import {expect,test} from '@playwright/test'
test('galeria: quatro temas, conteúdo longo, diálogo, teclado e celular',async({page})=>{
  await page.goto('/design-system.html')
  for(const width of [375,768,1440]){
    await page.setViewportSize({width,height:900})
    for(const palette of ['petroleo','brasa'])for(const theme of ['light','dark']){
      await page.getByLabel('Paleta').selectOption(palette);await page.getByLabel('Tema',{exact:true}).selectOption(theme)
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
      await expect(page.getByLabel('Título (obrigatório)')).toBeVisible()
    }
  }
  await page.setViewportSize({width:375,height:812})
  await page.getByRole('button',{name:'Abrir confirmação'}).click()
  await expect(page.getByRole('button',{name:'Cancelar',exact:true})).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByRole('button',{name:'Abrir confirmação'})).toBeFocused()
  await page.getByLabel('Título (obrigatório)').fill('Título muito longo com acentuação, revisão, confirmação e organização dos contextos pessoais')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
  await page.emulateMedia({reducedMotion:'reduce'})
  await expect(page.getByRole('button',{name:'Principal',exact:true})).toHaveCSS('transition-duration','0s')
  await page.screenshot({path:'test-results/design-mobile.png',fullPage:true})
})
