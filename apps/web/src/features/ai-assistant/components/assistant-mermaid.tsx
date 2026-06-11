import { useEffect, useId, useRef, useState } from 'react'
import { LoaderCircle } from 'lucide-react'

interface AssistantMermaidProps {
  code: string
}

export function AssistantMermaid({ code }: AssistantMermaidProps) {
  // eslint-disable-next-line unicorn/prefer-string-replace-all -- replaceAll is ES2021; tsconfig lib is ES2020
  const id = useId().replace(/:/g, '')
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!code.trim()) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    import('mermaid')
      .then(async ({ default: mermaid }) => {
        if (cancelled) return

        const isDark = document.documentElement.classList.contains('dark')

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'strict',
          fontFamily: 'inherit',
        })

        const diagramId = `mermaid-${id}`

        try {
          const { svg } = await mermaid.render(diagramId, code.trim())
          if (!cancelled && containerRef.current) {
            containerRef.current.innerHTML = svg
          }
        } catch (error_) {
          if (!cancelled) {
            setError(
              error_ instanceof Error
                ? error_.message
                : 'Failed to render diagram',
            )
          }
        } finally {
          if (!cancelled) setIsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load diagram renderer')
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [code, id])

  if (error) {
    return (
      <pre className="overflow-x-auto rounded-xl border border-border/60 bg-background p-3 text-xs text-muted-foreground">
        {code}
      </pre>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        Rendering diagram…
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="my-3 overflow-x-auto rounded-xl border border-border/60 bg-background p-3 [&_svg]:mx-auto [&_svg]:max-w-full"
    />
  )
}
