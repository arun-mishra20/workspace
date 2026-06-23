import { presets } from './presets'
import type {
  ThemePreset,
  ThemePresetDefinition,
  ThemePresetMeta,
} from './types'

function titleCasePresetName(name: string): string {
  return name
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function buildPreview(theme: ThemePreset) {
  return {
    light: [
      theme.light['--background'],
      theme.light['--primary'],
      theme.light['--accent'],
    ],
    dark: [
      theme.dark['--background'],
      theme.dark['--primary'],
      theme.dark['--accent'],
    ],
  }
}

const EXPRESSIVE_PRESET_DETAILS: Partial<
  Record<
    string,
    Omit<ThemePresetMeta, 'name' | 'preview'> & {
      cleanupPrefixes?: string[]
      loadStyles?: () => Promise<unknown>
    }
  >
> = {
  ocean: {
    label: 'Ocean',
    description: 'Calm minimal surfaces with soft blue-tinted shadows and generous rounding.',
    family: 'classic',
    tags: ['blue', 'calm', 'minimal'],
    styleControlId: 'none',
    cleanupPrefixes: ['--ocean-'],
    loadStyles: () => import('@workspace/ui/styles/ocean.css'),
  },
  rose: {
    label: 'Rose',
    description: 'Warm soft surfaces with rosy ambient shadows and generous pill rounding.',
    family: 'classic',
    tags: ['warm', 'soft', 'pink'],
    styleControlId: 'none',
    cleanupPrefixes: ['--rose-'],
    loadStyles: () => import('@workspace/ui/styles/rose.css'),
  },
  sunset: {
    label: 'Sunset',
    description: 'Energetic warmth with crisp amber shadows and tight snappy corners.',
    family: 'classic',
    tags: ['warm', 'amber', 'energetic'],
    styleControlId: 'none',
    loadStyles: () => import('@workspace/ui/styles/sunset.css'),
  },
  forest: {
    label: 'Forest',
    description: 'Earthy natural surfaces with green-tinted ambient shadows and organic rounding.',
    family: 'classic',
    tags: ['green', 'earthy', 'natural'],
    styleControlId: 'none',
    loadStyles: () => import('@workspace/ui/styles/forest.css'),
  },
  lavender: {
    label: 'Lavender',
    description: 'Ethereal dreamlike surfaces with diffused purple glow and generous rounding.',
    family: 'classic',
    tags: ['purple', 'ethereal', 'dreamy'],
    styleControlId: 'none',
    loadStyles: () => import('@workspace/ui/styles/lavender.css'),
  },
  supabase: {
    label: 'Supabase',
    description: 'Clean tech aesthetic with precise teal shadows and sharp compact corners.',
    family: 'classic',
    tags: ['teal', 'tech', 'precise'],
    styleControlId: 'none',
    loadStyles: () => import('@workspace/ui/styles/supabase.css'),
  },
  neumorphism: {
    label: 'Neumorphism',
    description: 'Soft extruded surfaces with tactile depth and gentle shadows.',
    family: 'expressive',
    tags: ['soft', 'depth', 'tactile'],
    styleControlId: 'neumorphism',
    cleanupPrefixes: ['--neu-'],
    loadStyles: () => import('@workspace/ui/styles/neumorphism.css'),
  },
  glassmorphism: {
    label: 'Glassmorphism',
    description: 'Translucent panels, blur, and luminous edges inspired by frosted glass.',
    family: 'expressive',
    tags: ['glass', 'blur', 'luminous'],
    styleControlId: 'glassmorphism',
    cleanupPrefixes: ['--glass-'],
    loadStyles: () => import('@workspace/ui/styles/glassmorphism.css'),
  },
  brutalism: {
    label: 'Brutalism',
    description: 'Blocky contrast, thick borders, poster colors, and raw physical shadows.',
    family: 'expressive',
    tags: ['bold', 'poster', 'raw'],
    styleControlId: 'brutalism',
    cleanupPrefixes: ['--brutal-'],
    loadStyles: () => import('@workspace/ui/styles/brutalism.css'),
  },
  academia: {
    label: 'Academia',
    description: 'Warm paper tones, literary serif typography, and annotated notebook details.',
    family: 'expressive',
    tags: ['paper', 'serif', 'scholarly'],
    styleControlId: 'academia',
    cleanupPrefixes: ['--academia-'],
    loadStyles: () => import('@workspace/ui/styles/academia.css'),
  },
  'retro-terminal': {
    label: 'Retro Terminal',
    description: 'Phosphor display glow, scanlines, and monochrome command-line energy.',
    family: 'expressive',
    tags: ['crt', 'terminal', 'retro'],
    styleControlId: 'retro-terminal',
    cleanupPrefixes: ['--retro-'],
    loadStyles: () => import('@workspace/ui/styles/retro-terminal.css'),
  },
  editorial: {
    label: 'Editorial',
    description: 'Magazine hierarchy, sharp type contrast, and restrained luxury framing.',
    family: 'expressive',
    tags: ['magazine', 'typography', 'luxury'],
    styleControlId: 'editorial',
    cleanupPrefixes: ['--editorial-'],
    loadStyles: () => import('@workspace/ui/styles/editorial.css'),
  },
  bauhaus: {
    label: 'Bauhaus',
    description: 'Geometric surfaces, primary colors, and playful asymmetry.',
    family: 'expressive',
    tags: ['geometry', 'poster', 'color-block'],
    styleControlId: 'bauhaus',
    cleanupPrefixes: ['--bauhaus-'],
    loadStyles: () => import('@workspace/ui/styles/bauhaus.css'),
  },
  blueprint: {
    label: 'Blueprint',
    description: 'Drafting-grid surfaces, cyan utility lines, and technical dashboard contrast.',
    family: 'expressive',
    tags: ['technical', 'grid', 'cyan'],
    styleControlId: 'blueprint',
    cleanupPrefixes: ['--blueprint-'],
    loadStyles: () => import('@workspace/ui/styles/blueprint.css'),
  },
  cyberpunk: {
    label: 'Cyberpunk',
    description: 'Neon-soaked grid, glitch effects, sharp-cut geometry, and high-voltage glow.',
    family: 'expressive',
    tags: ['neon', 'grid', 'futuristic'],
    styleControlId: 'cyberpunk',
    cleanupPrefixes: ['--cyber-'],
    loadStyles: () => import('@workspace/ui/styles/cyberpunk.css'),
  },
  handwritten: {
    label: 'Handwritten',
    description: 'Playful sketchbook feel with wobbly borders, warm cream, and pencil textures.',
    family: 'expressive',
    tags: ['sketch', 'playful', 'organic'],
    styleControlId: 'handwritten',
    cleanupPrefixes: ['--sketch-'],
    loadStyles: () => import('@workspace/ui/styles/handwritten.css'),
  },
  'art-deco': {
    label: 'Art Deco',
    description: 'Geometric 1920s luxury with gold-leaf opulence and sharp symmetry.',
    family: 'expressive',
    tags: ['gold', 'luxury', 'geometric'],
    styleControlId: 'art-deco',
    cleanupPrefixes: ['--deco-'],
    loadStyles: () => import('@workspace/ui/styles/art-deco.css'),
  },
  synthwave: {
    label: 'Synthwave',
    description: '80s neon sunset gradients, chrome reflections, and vapor aesthetics.',
    family: 'expressive',
    tags: ['retro', 'neon', '80s'],
    styleControlId: 'synthwave',
    cleanupPrefixes: ['--synth-'],
    loadStyles: () => import('@workspace/ui/styles/synthwave.css'),
  },
  zen: {
    label: 'Zen',
    description: 'Calm ink-wash minimalism with breathing space and deliberate pacing.',
    family: 'expressive',
    tags: ['minimal', 'calm', 'japanese'],
    styleControlId: 'zen',
    cleanupPrefixes: ['--zen-'],
    loadStyles: () => import('@workspace/ui/styles/zen.css'),
  },
}

const PRESET_METADATA_OVERRIDES: Partial<
  Record<string, Pick<ThemePresetMeta, 'label' | 'description'>>
> = {
  default: {
    label: 'Neutral',
    description:
      'Monochrome baseline with sharp contrast. Distinct from the app default (Neumorphism) used for FOUC and first load.',
  },
}

function createDefinition(name: string, theme: ThemePreset): ThemePresetDefinition {
  const expressiveDetails = EXPRESSIVE_PRESET_DETAILS[name]
  const metadataOverride = PRESET_METADATA_OVERRIDES[name]

  return {
    meta: {
      name,
      label: metadataOverride?.label ?? expressiveDetails?.label ?? titleCasePresetName(name),
      description:
        metadataOverride?.description ??
        expressiveDetails?.description ??
        `${titleCasePresetName(name)} preset for the workspace theme system.`,
      family: expressiveDetails?.family ?? 'classic',
      tags: expressiveDetails?.tags ?? ['token'],
      preview: buildPreview(theme),
      styleControlId: expressiveDetails?.styleControlId ?? 'none',
    },
    theme,
    cleanupPrefixes: expressiveDetails?.cleanupPrefixes,
    loadStyles: expressiveDetails?.loadStyles,
  }
}

export const presetDefinitions: Record<string, ThemePresetDefinition> =
  Object.fromEntries(
    Object.entries(presets).map(([name, theme]) => [name, createDefinition(name, theme)]),
  )

export const presetMetas: ThemePresetMeta[] = Object.values(presetDefinitions).map(
  ({ meta }) => meta,
)

export const STYLE_PRESET_NAMES = new Set<string>(
  presetMetas.filter((meta) => meta.styleControlId !== 'none').map((meta) => meta.name),
)
