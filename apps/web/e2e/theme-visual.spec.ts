import { expect, test } from '@playwright/test'

const THEME_STORAGE_KEY = 'workspace-theme'

function buildThemeConfig(preset: string) {
  return JSON.stringify({
    preset,
    overrides: { light: {}, dark: {} },
    navigationLayout: 'sidebar',
  })
}

test.describe('Theme visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('neumorphism light baseline matches snapshot', async ({ page }) => {
    await page.evaluate(
      ([key, config]) => {
        localStorage.setItem(key, config)
      },
      [THEME_STORAGE_KEY, buildThemeConfig('neumorphism')] as const,
    )
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme-preset', 'neumorphism')
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    await expect(page).toHaveScreenshot('neumorphism-light.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    })
  })

  test('neumorphism dark baseline matches snapshot', async ({ page }) => {
    await page.evaluate(
      ([key, config]) => {
        localStorage.setItem(key, config)
        localStorage.setItem('vite-ui-theme', 'dark')
      },
      [THEME_STORAGE_KEY, buildThemeConfig('neumorphism')] as const,
    )
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme-preset', 'neumorphism')
    await expect(page.locator('html')).toHaveClass(/dark/)

    await expect(page).toHaveScreenshot('neumorphism-dark.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    })
  })

  test('ocean preset applies without visual drift', async ({ page }) => {
    await page.evaluate(
      ([key, config]) => {
        localStorage.setItem(key, config)
      },
      [THEME_STORAGE_KEY, buildThemeConfig('ocean')] as const,
    )
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme-preset', 'ocean')

    await expect(page).toHaveScreenshot('ocean-light.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    })
  })
})
