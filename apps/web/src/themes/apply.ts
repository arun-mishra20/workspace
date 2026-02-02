/**
 * Theme Application Logic
 *
 * Applies theme CSS variables to the DOM.
 */

import type { ThemePreset } from "./types";

/**
 * Apply theme to the DOM by setting CSS custom properties
 *
 * @param theme - The complete theme with light and dark mode values
 */
export function applyTheme(theme: ThemePreset): void {
  const root = document.documentElement;

  // Apply light mode variables to :root
  for (const [key, value] of Object.entries(theme.light)) {
    root.style.setProperty(key, value);
  }

  // For dark mode, we need to find or create a style element
  // that targets .dark class specifically
  applyDarkModeVariables(theme.dark);
}

/**
 * Apply dark mode CSS variables
 * We create a style element that targets :root.dark with !important
 * to ensure it overrides the inline styles set on :root
 */
function applyDarkModeVariables(darkVars: Record<string, string>): void {
  const styleId = "workspace-theme-dark-vars";
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  // Build CSS rule for :root.dark with !important to override inline styles
  const cssVars = Object.entries(darkVars)
    .map(([key, value]) => `  ${key}: ${value} !important;`)
    .join("\n");

  styleEl.textContent = `:root.dark {\n${cssVars}\n}`;
}

/**
 * Remove all custom theme properties
 * This resets to whatever is defined in the base CSS
 */
export function removeTheme(): void {
  // Remove the dynamic style element for dark mode
  const styleId = "workspace-theme-dark-vars";
  const styleEl = document.getElementById(styleId);
  if (styleEl) {
    styleEl.remove();
  }

  // For light mode, we'd need to know which properties to remove
  // Since we're applying presets, we don't actually need to remove them
  // The next preset will just override them
}

/**
 * Merge preset with overrides to create final theme
 *
 * @param preset - Base preset theme
 * @param overrides - User overrides for light and dark modes
 * @returns Merged theme
 */
export function mergeThemeWithOverrides(
  preset: ThemePreset,
  overrides: { light: Record<string, string>; dark: Record<string, string> },
): ThemePreset {
  return {
    light: { ...preset.light, ...overrides.light },
    dark: { ...preset.dark, ...overrides.dark },
  };
}
