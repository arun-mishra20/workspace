import type { ThemePreset } from './types'

type SemanticPair = Pick<
  ThemePreset['light'],
  '--positive' | '--negative' | '--info' | '--warning' | '--success'
>

function semantic(
  light: SemanticPair,
  dark: SemanticPair,
): ThemePreset {
  return { light, dark }
}

/**
 * Palette-tuned semantic status colors per preset.
 * Keys not listed fall back to DEFAULT_SEMANTIC_TOKENS.
 */
export const PRESET_SEMANTIC_OVERRIDES: Partial<Record<string, ThemePreset>> = {
  neumorphism: semantic(
    {
      '--positive': 'oklch(0.68 0.12 165)',
      '--negative': 'oklch(0.646 0.175 15)',
      '--info': 'oklch(0.588 0.215 277)',
      '--warning': 'oklch(0.78 0.14 75)',
      '--success': 'oklch(0.68 0.12 165)',
    },
    {
      '--positive': 'oklch(0.72 0.12 165)',
      '--negative': 'oklch(0.695 0.155 15)',
      '--info': 'oklch(0.65 0.19 277)',
      '--warning': 'oklch(0.865 0.1 80)',
      '--success': 'oklch(0.72 0.12 165)',
    },
  ),
  glassmorphism: semantic(
    {
      '--positive': 'oklch(0.765 0.145 163)',
      '--negative': 'oklch(0.637 0.237 25)',
      '--info': 'oklch(0.623 0.214 259)',
      '--warning': 'oklch(0.769 0.164 70)',
      '--success': 'oklch(0.765 0.145 163)',
    },
    {
      '--positive': 'oklch(0.805 0.13 165)',
      '--negative': 'oklch(0.712 0.17 22)',
      '--info': 'oklch(0.714 0.143 254)',
      '--warning': 'oklch(0.828 0.164 84)',
      '--success': 'oklch(0.805 0.13 165)',
    },
  ),
  'retro-terminal': semantic(
    {
      '--positive': 'oklch(0.88 0.2 145)',
      '--negative': 'oklch(0.72 0.22 25)',
      '--info': 'oklch(0.88 0.12 180)',
      '--warning': 'oklch(0.9 0.15 95)',
      '--success': 'oklch(0.88 0.2 145)',
    },
    {
      '--positive': 'oklch(0.88 0.2 145)',
      '--negative': 'oklch(0.75 0.2 25)',
      '--info': 'oklch(0.88 0.12 180)',
      '--warning': 'oklch(0.9 0.15 95)',
      '--success': 'oklch(0.88 0.2 145)',
    },
  ),
  brutalism: semantic(
    {
      '--positive': 'oklch(0.62 0.18 180)',
      '--negative': 'oklch(0.62 0.24 35)',
      '--info': 'oklch(0.55 0.15 240)',
      '--warning': 'oklch(0.78 0.16 85)',
      '--success': 'oklch(0.62 0.18 180)',
    },
    {
      '--positive': 'oklch(0.72 0.16 180)',
      '--negative': 'oklch(0.68 0.22 35)',
      '--info': 'oklch(0.65 0.14 240)',
      '--warning': 'oklch(0.82 0.14 85)',
      '--success': 'oklch(0.72 0.16 180)',
    },
  ),
  academia: semantic(
    {
      '--positive': 'oklch(0.52 0.08 145)',
      '--negative': 'oklch(0.55 0.14 25)',
      '--info': 'oklch(0.48 0.06 60)',
      '--warning': 'oklch(0.72 0.1 75)',
      '--success': 'oklch(0.52 0.08 145)',
    },
    {
      '--positive': 'oklch(0.62 0.08 145)',
      '--negative': 'oklch(0.65 0.12 25)',
      '--info': 'oklch(0.58 0.06 60)',
      '--warning': 'oklch(0.78 0.1 75)',
      '--success': 'oklch(0.62 0.08 145)',
    },
  ),
  ledger: semantic(
    {
      '--positive': '#2E6F4E',
      '--negative': '#A8462E',
      '--info': '#3B5A63',
      '--warning': '#AD8A2E',
      '--success': '#2E6F4E',
    },
    {
      '--positive': '#5FC08C',
      '--negative': '#E2896A',
      '--info': '#7FAFBE',
      '--warning': '#E3BE5C',
      '--success': '#5FC08C',
    },
  ),
  editorial: semantic(
    {
      '--positive': 'oklch(0.45 0.06 145)',
      '--negative': 'oklch(0.52 0.16 25)',
      '--info': 'oklch(0.35 0.02 260)',
      '--warning': 'oklch(0.72 0.1 75)',
      '--success': 'oklch(0.45 0.06 145)',
    },
    {
      '--positive': 'oklch(0.62 0.08 145)',
      '--negative': 'oklch(0.62 0.14 25)',
      '--info': 'oklch(0.75 0.04 260)',
      '--warning': 'oklch(0.82 0.1 75)',
      '--success': 'oklch(0.62 0.08 145)',
    },
  ),
  bauhaus: semantic(
    {
      '--positive': 'oklch(0.55 0.2 145)',
      '--negative': 'oklch(0.577 0.245 27)',
      '--info': 'oklch(0.52 0.2 260)',
      '--warning': 'oklch(0.82 0.18 85)',
      '--success': 'oklch(0.55 0.2 145)',
    },
    {
      '--positive': 'oklch(0.65 0.18 145)',
      '--negative': 'oklch(0.65 0.22 27)',
      '--info': 'oklch(0.65 0.18 260)',
      '--warning': 'oklch(0.85 0.16 85)',
      '--success': 'oklch(0.65 0.18 145)',
    },
  ),
  blueprint: semantic(
    {
      '--positive': 'oklch(0.62 0.12 165)',
      '--negative': 'oklch(0.577 0.245 27)',
      '--info': 'oklch(0.55 0.14 230)',
      '--warning': 'oklch(0.768 0.189 70)',
      '--success': 'oklch(0.62 0.12 165)',
    },
    {
      '--positive': 'oklch(0.72 0.12 165)',
      '--negative': 'oklch(0.637 0.237 25)',
      '--info': 'oklch(0.72 0.14 230)',
      '--warning': 'oklch(0.828 0.189 84)',
      '--success': 'oklch(0.72 0.12 165)',
    },
  ),
  cyberpunk: semantic(
    {
      '--positive': 'oklch(0.75 0.18 195)',
      '--negative': 'oklch(0.65 0.28 340)',
      '--info': 'oklch(0.78 0.2 195)',
      '--warning': 'oklch(0.82 0.18 85)',
      '--success': 'oklch(0.75 0.18 195)',
    },
    {
      '--positive': 'oklch(0.78 0.18 195)',
      '--negative': 'oklch(0.68 0.26 340)',
      '--info': 'oklch(0.82 0.18 195)',
      '--warning': 'oklch(0.85 0.16 85)',
      '--success': 'oklch(0.78 0.18 195)',
    },
  ),
  synthwave: semantic(
    {
      '--positive': 'oklch(0.72 0.16 240)',
      '--negative': 'oklch(0.65 0.3 330)',
      '--info': 'oklch(0.72 0.16 240)',
      '--warning': 'oklch(0.82 0.18 85)',
      '--success': 'oklch(0.72 0.16 240)',
    },
    {
      '--positive': 'oklch(0.75 0.14 240)',
      '--negative': 'oklch(0.68 0.28 330)',
      '--info': 'oklch(0.75 0.14 240)',
      '--warning': 'oklch(0.85 0.16 85)',
      '--success': 'oklch(0.75 0.14 240)',
    },
  ),
  zen: semantic(
    {
      '--positive': 'oklch(0.52 0.06 145)',
      '--negative': 'oklch(0.577 0.245 27)',
      '--info': 'oklch(0.45 0.06 260)',
      '--warning': 'oklch(0.72 0.08 75)',
      '--success': 'oklch(0.52 0.06 145)',
    },
    {
      '--positive': 'oklch(0.62 0.06 145)',
      '--negative': 'oklch(0.637 0.237 25)',
      '--info': 'oklch(0.58 0.06 260)',
      '--warning': 'oklch(0.78 0.08 75)',
      '--success': 'oklch(0.62 0.06 145)',
    },
  ),
  handwritten: semantic(
    {
      '--positive': 'oklch(0.55 0.1 145)',
      '--negative': 'oklch(0.577 0.245 27)',
      '--info': 'oklch(0.65 0.12 240)',
      '--warning': 'oklch(0.768 0.189 70)',
      '--success': 'oklch(0.55 0.1 145)',
    },
    {
      '--positive': 'oklch(0.65 0.1 145)',
      '--negative': 'oklch(0.637 0.237 25)',
      '--info': 'oklch(0.72 0.1 240)',
      '--warning': 'oklch(0.828 0.189 84)',
      '--success': 'oklch(0.65 0.1 145)',
    },
  ),
  'art-deco': semantic(
    {
      '--positive': 'oklch(0.55 0.12 165)',
      '--negative': 'oklch(0.577 0.245 27)',
      '--info': 'oklch(0.55 0.12 165)',
      '--warning': 'oklch(0.75 0.15 85)',
      '--success': 'oklch(0.55 0.12 165)',
    },
    {
      '--positive': 'oklch(0.65 0.12 165)',
      '--negative': 'oklch(0.637 0.237 25)',
      '--info': 'oklch(0.65 0.12 165)',
      '--warning': 'oklch(0.82 0.14 85)',
      '--success': 'oklch(0.65 0.12 165)',
    },
  ),
  ocean: semantic(
    {
      '--positive': 'oklch(0.527 0.154 150.069)',
      '--negative': 'oklch(0.577 0.245 27.325)',
      '--info': 'oklch(0.55 0.20 240)',
      '--warning': 'oklch(0.768 0.189 70.08)',
      '--success': 'oklch(0.527 0.154 150.069)',
    },
    {
      '--positive': 'oklch(0.696 0.17 162.48)',
      '--negative': 'oklch(0.637 0.237 25.331)',
      '--info': 'oklch(0.58 0.18 240)',
      '--warning': 'oklch(0.828 0.189 84.429)',
      '--success': 'oklch(0.696 0.17 162.48)',
    },
  ),
  rose: semantic(
    {
      '--positive': 'oklch(0.527 0.154 150.069)',
      '--negative': 'oklch(0.577 0.245 27.325)',
      '--info': 'oklch(0.58 0.22 20)',
      '--warning': 'oklch(0.768 0.189 70.08)',
      '--success': 'oklch(0.527 0.154 150.069)',
    },
    {
      '--positive': 'oklch(0.696 0.17 162.48)',
      '--negative': 'oklch(0.637 0.237 25.331)',
      '--info': 'oklch(0.65 0.2 20)',
      '--warning': 'oklch(0.828 0.189 84.429)',
      '--success': 'oklch(0.696 0.17 162.48)',
    },
  ),
  sunset: semantic(
    {
      '--positive': 'oklch(0.527 0.154 150.069)',
      '--negative': 'oklch(0.577 0.245 27.325)',
      '--info': 'oklch(0.60 0.19 47.66)',
      '--warning': 'oklch(0.768 0.189 70.08)',
      '--success': 'oklch(0.527 0.154 150.069)',
    },
    {
      '--positive': 'oklch(0.696 0.17 162.48)',
      '--negative': 'oklch(0.637 0.237 25.331)',
      '--info': 'oklch(0.65 0.16 47.66)',
      '--warning': 'oklch(0.828 0.189 84.429)',
      '--success': 'oklch(0.696 0.17 162.48)',
    },
  ),
  forest: semantic(
    {
      '--positive': 'oklch(0.527 0.154 150.069)',
      '--negative': 'oklch(0.577 0.245 27.325)',
      '--info': 'oklch(0.45 0.15 142.50)',
      '--warning': 'oklch(0.768 0.189 70.08)',
      '--success': 'oklch(0.527 0.154 150.069)',
    },
    {
      '--positive': 'oklch(0.696 0.17 162.48)',
      '--negative': 'oklch(0.637 0.237 25.331)',
      '--info': 'oklch(0.58 0.15 142.50)',
      '--warning': 'oklch(0.828 0.189 84.429)',
      '--success': 'oklch(0.696 0.17 162.48)',
    },
  ),
  lavender: semantic(
    {
      '--positive': 'oklch(0.527 0.154 150.069)',
      '--negative': 'oklch(0.577 0.245 27.325)',
      '--info': 'oklch(0.55 0.12 320)',
      '--warning': 'oklch(0.768 0.189 70.08)',
      '--success': 'oklch(0.527 0.154 150.069)',
    },
    {
      '--positive': 'oklch(0.696 0.17 162.48)',
      '--negative': 'oklch(0.637 0.237 25.331)',
      '--info': 'oklch(0.68 0.12 320)',
      '--warning': 'oklch(0.828 0.189 84.429)',
      '--success': 'oklch(0.696 0.17 162.48)',
    },
  ),
  supabase: semantic(
    {
      '--positive': 'oklch(0.527 0.154 150.069)',
      '--negative': 'oklch(0.577 0.245 27.325)',
      '--info': 'oklch(0.50 0.17 166.11)',
      '--warning': 'oklch(0.768 0.189 70.08)',
      '--success': 'oklch(0.527 0.154 150.069)',
    },
    {
      '--positive': 'oklch(0.696 0.17 162.48)',
      '--negative': 'oklch(0.637 0.237 25.331)',
      '--info': 'oklch(0.62 0.17 166.11)',
      '--warning': 'oklch(0.828 0.189 84.429)',
      '--success': 'oklch(0.696 0.17 162.48)',
    },
  ),
}
