import { parseMetricBlock } from '@/features/ai-assistant/components/assistant-metric-card'

// ── Types ──────────────────────────────────────────────────────────────────

export interface MetricData {
  label: string
  value: string
  trend?: 'up' | 'down' | 'flat'
  change?: string
}

export interface ChartSeries {
  key: string
  label: string
}

export interface ChartSpec {
  type: 'bar' | 'line' | 'area' | 'pie'
  title?: string
  /** Field name used for the x-axis (bar/line/area only) */
  xKey?: string
  data: Record<string, unknown>[]
  /** Series definitions for bar/line/area charts */
  series?: ChartSeries[]
}

export type ParsedBlock =
  | { type: 'markdown'; content: string }
  | { type: 'metric'; data: MetricData }
  | { type: 'actions'; items: string[] }
  | { type: 'chart'; spec: ChartSpec }

// ── Parsers ────────────────────────────────────────────────────────────────

type BlockPayload = Omit<ParsedBlock, 'type'>
type BlockParser = (raw: string) => BlockPayload | null

export const BLOCK_PARSERS: Record<string, BlockParser> = {
  metric: (raw) => {
    const data = parseMetricBlock(raw)
    return data ? { data } : null
  },

  actions: (raw) => {
    const items = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    return items.length > 0 ? { items } : null
  },

  chart: (raw) => {
    try {
      const spec = JSON.parse(raw.trim()) as ChartSpec
      if (!spec.type || !Array.isArray(spec.data)) return null
      return { spec }
    } catch {
      return null
    }
  },
}

export const SUPPORTED_BLOCK_TYPES = Object.keys(BLOCK_PARSERS)

// ── Parser ─────────────────────────────────────────────────────────────────

const BLOCK_REGEX = new RegExp(
  `:::(${SUPPORTED_BLOCK_TYPES.join('|')})\\n([\\s\\S]*?):::`,
  'g',
)

export function parseStructuredContent(raw: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = []
  let lastIndex = 0

  for (const match of raw.matchAll(BLOCK_REGEX)) {
    const beforeText = raw.slice(lastIndex, match.index)
    if (beforeText.trim()) {
      blocks.push({ type: 'markdown', content: beforeText })
    }

    const blockType = match[1]
    const blockContent = match[2]?.trim() ?? ''
    const parser = BLOCK_PARSERS[blockType]

    if (parser) {
      const payload = parser(blockContent)
      if (payload) {
        blocks.push({ type: blockType, ...payload } as ParsedBlock)
      }
    }

    lastIndex = (match.index ?? 0) + match[0].length
  }

  const remaining = raw.slice(lastIndex)
  if (remaining.trim()) {
    blocks.push({ type: 'markdown', content: remaining })
  }

  if (blocks.length === 0 && raw.trim()) {
    blocks.push({ type: 'markdown', content: raw })
  }

  return blocks
}
