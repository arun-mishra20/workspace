import { LoaderCircle } from 'lucide-react'
import { useMemo } from 'react'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import { AssistantChart } from '@/features/ai-assistant/components/assistant-chart'
import { AssistantMermaid } from '@/features/ai-assistant/components/assistant-mermaid'
import { AssistantMetricCard } from '@/features/ai-assistant/components/assistant-metric-card'
import { AssistantSuggestedActions } from '@/features/ai-assistant/components/assistant-suggested-actions'
import {
  parseStructuredContent,
  type ParsedBlock,
} from '@/features/ai-assistant/components/block-registry'

interface AssistantMessageProps {
  content: string
  isStreaming?: boolean
  activeTools?: string[]
  onSuggestedAction?: (action: string) => void
}

const PROSE_CLASSES =
  'prose prose-sm max-w-none wrap-anywhere prose-headings:mb-2 prose-headings:mt-4 prose-headings:text-foreground prose-p:my-2 prose-p:text-foreground prose-strong:text-foreground prose-ul:my-2 prose-li:my-1 prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-foreground prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:border prose-pre:border-border/60 prose-pre:bg-background prose-table:block prose-table:overflow-x-auto prose-table:text-sm prose-th:text-left prose-td:align-top [&_.katex-display]:overflow-x-auto [&_.katex-display]:py-2 [&_.katex]:text-foreground dark:prose-invert'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REHYPE_PLUGINS = [
  rehypeKatex,
  [rehypeHighlight, { ignoreMissing: true }],
] as any[]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REMARK_PLUGINS = [remarkGfm, remarkMath] as any[]

function MarkdownBlock({ content }: { content: string }) {
  return (
    <div className={PROSE_CLASSES}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={{
          code(props) {
            const { children, className, ...rest } = props as {
              children?: React.ReactNode
              className?: string
              node?: unknown
            }
            // Intercept mermaid fenced code blocks — render as diagram
            if (className?.includes('language-mermaid')) {
              const codeText =
                typeof children === 'string' ? children.replace(/\n$/, '') : ''
              return <AssistantMermaid code={codeText} />
            }
            return (
              <code
                className={[className, 'wrap-anywhere']
                  .filter(Boolean)
                  .join(' ')}
                {...rest}
              >
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function renderBlock(
  block: ParsedBlock,
  onSuggestedAction?: (action: string) => void,
): React.ReactNode {
  switch (block.type) {
    case 'markdown': {
      return <MarkdownBlock content={block.content} />
    }
    case 'metric': {
      return <AssistantMetricCard metric={block.data} />
    }
    case 'actions': {
      return onSuggestedAction ? (
        <AssistantSuggestedActions
          actions={block.items}
          onAction={onSuggestedAction}
        />
      ) : null
    }
    case 'chart': {
      return <AssistantChart spec={block.spec} />
    }
    default: {
      return null
    }
  }
}

export function AssistantMessage({
  content,
  isStreaming,
  activeTools,
  onSuggestedAction,
}: AssistantMessageProps) {
  const hasActiveTools = activeTools && activeTools.length > 0

  const blocks = useMemo(() => {
    if (!content || isStreaming) return []
    return parseStructuredContent(content)
  }, [content, isStreaming])

  return (
    <div>
      {hasActiveTools && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {activeTools.map((tool) => (
            <span
              key={tool}
              className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              <LoaderCircle className="size-2.5 animate-spin" />
              {tool}
            </span>
          ))}
        </div>
      )}

      {isStreaming ? (
        content ? (
          <div className={PROSE_CLASSES}>
            <ReactMarkdown
              remarkPlugins={REMARK_PLUGINS}
              rehypePlugins={REHYPE_PLUGINS}
            >
              {content}
            </ReactMarkdown>
            <span className="inline-block size-2 animate-pulse rounded-full bg-foreground/40" />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            {hasActiveTools ? 'Running tools...' : 'Thinking...'}
          </div>
        )
      ) : blocks.length > 0 ? (
        <div>
          {blocks.map((block, i) => (
            <div key={i}>{renderBlock(block, onSuggestedAction)}</div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
