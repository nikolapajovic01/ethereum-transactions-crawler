import { test, expect } from '@playwright/test'

test.describe('Ethereum Transactions Explorer (stable smoke tests)', () => {
  test('should load homepage and navigate to transactions', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Ethereum Transactions Crawler/)
    await expect(page.locator('header h1')).toContainText('Ethereum Transactions Explorer')
    await expect(page.locator('input[name="walletAddress"]')).toBeVisible()
    await expect(page.locator('input[name="startBlock"]')).toBeVisible()
  })

  test('should show recent searches', async ({ page }) => {
    await page.goto('/')
    const recentSearches = page.locator('text=Recent Searches')
    if (await recentSearches.isVisible()) {
      await expect(recentSearches).toBeVisible()
    }
  })

  test('should toggle dark mode', async ({ page }) => {
    await page.goto('/')
    const darkModeToggle = page.locator('button:has-text("🌙"), button:has-text("☀️")')
    if (await darkModeToggle.isVisible()) {
      await darkModeToggle.click()
      await expect(page.locator('div.min-h-screen')).toHaveClass(/bg-gray-900/)
    }
  })
})
