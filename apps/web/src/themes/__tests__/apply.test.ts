import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { applyThemeWithPreset } from '../apply'
import type { ThemePreset } from '../types'

const minimalTheme: ThemePreset = {
  light: { '--background': 'oklch(1 0 0)' },
  dark: { '--background': 'oklch(0 0 0)' },
}

describe('applyThemeWithPreset', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.documentElement.classList.remove('theme-switching')
    document.documentElement.removeAttribute('data-theme-preset')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sets data-theme-preset on the document root', () => {
    applyThemeWithPreset(minimalTheme, 'slate')
    expect(document.documentElement.dataset.themePreset).toBe('slate')
  })

  it('adds theme-switching class briefly when preset changes', () => {
    applyThemeWithPreset(minimalTheme, 'slate')
    applyThemeWithPreset(minimalTheme, 'default')

    expect(document.documentElement.classList.contains('theme-switching')).toBe(
      true,
    )

    vi.advanceTimersByTime(150)

    expect(document.documentElement.classList.contains('theme-switching')).toBe(
      false,
    )
  })

  it('skips theme-switching class when reduced motion is preferred', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )

    applyThemeWithPreset(minimalTheme, 'slate')
    applyThemeWithPreset(minimalTheme, 'default')

    expect(document.documentElement.classList.contains('theme-switching')).toBe(
      false,
    )

    vi.unstubAllGlobals()
  })
})
