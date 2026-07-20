import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { MainLayout } from '@/components/layouts'
import {
  fetchPlaygroundEmails,
  type FetchPlaygroundEmailsResponse,
} from '@/features/playground/api/fetch-emails'
import type { RawEmail } from '@workspace/domain'
import { Badge } from '@workspace/ui/components/ui/badge'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Input } from '@workspace/ui/components/ui/input'
import { Label } from '@workspace/ui/components/ui/label'
import { ScrollArea } from '@workspace/ui/components/ui/scroll-area'
import { Textarea } from '@workspace/ui/components/ui/textarea'
import { Play, Search } from 'lucide-react'

type ParsedEmailResult = {
  emailId: string
  extracted: Record<string, unknown>
  error?: string
}

const DEFAULT_QUERY =
  'subject:(statement OR receipt OR purchase) newer_than:30d'

const DEFAULT_PARSER = `(email) => {
  const amountMatch = email.bodyText.match(/(?:₹|Rs\\.?|INR)\\s?([\\d,]+(?:\\.\\d{2})?)/i)
  const refMatch = email.bodyText.match(/(?:ref(?:erence)?|txn(?:\s*id)?)[\s:#-]*([A-Z0-9]{6,})/i)

  return {
    subject: email.subject,
    from: email.from,
    amount: amountMatch?.[1] ?? null,
    reference: refMatch?.[1] ?? null,
  }
}`

function parseLimit(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return 10
  return Math.max(1, Math.min(20, parsed))
}

function buildParserFunction(code: string): (email: RawEmail) => unknown {
  const compiled = new Function(`"use strict"; return (${code});`)()

  if (typeof compiled !== 'function') {
    throw new Error('Parser must be a function: (email) => ({ ... })')
  }

  return compiled as (email: RawEmail) => unknown
}

function normalizeExtracted(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Parser must return an object map')
  }

  return value as Record<string, unknown>
}

export default function PlaygroundPage() {
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [limitInput, setLimitInput] = useState('10')
  const [parserCode, setParserCode] = useState(DEFAULT_PARSER)
  const [fetchedEmails, setFetchedEmails] = useState<RawEmail[]>([])
  const [parsedResults, setParsedResults] = useState<ParsedEmailResult[]>([])
  const [parserCompileError, setParserCompileError] = useState<string | null>(
    null,
  )

  const fetchMutation = useMutation({
    mutationFn: (input: { query: string; limit: number }) =>
      fetchPlaygroundEmails(input),
    onSuccess: (response: FetchPlaygroundEmailsResponse) => {
      setFetchedEmails(response.data)
      setParsedResults([])
      setParserCompileError(null)
    },
  })

  const hasEmails = fetchedEmails.length > 0

  const output = useMemo(() => {
    if (parsedResults.length > 0) {
      return parsedResults
    }

    if (hasEmails) {
      return fetchedEmails
    }

    return []
  }, [fetchedEmails, hasEmails, parsedResults])

  const handleFetch = () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return
    }

    fetchMutation.mutate({
      query: trimmedQuery,
      limit: parseLimit(limitInput),
    })
  }

  const handleRunParser = () => {
    setParserCompileError(null)

    if (!hasEmails) {
      return
    }

    let parserFn: (email: RawEmail) => unknown

    try {
      parserFn = buildParserFunction(parserCode)
    } catch (error) {
      setParserCompileError(
        error instanceof Error ? error.message : 'Invalid parser code',
      )
      setParsedResults([])
      return
    }

    const results: ParsedEmailResult[] = fetchedEmails.map((email) => {
      try {
        const extracted = normalizeExtracted(parserFn(email))
        return {
          emailId: email.id,
          extracted,
        }
      } catch (error) {
        return {
          emailId: email.id,
          extracted: {},
          error:
            error instanceof Error
              ? error.message
              : 'Failed to parse this email',
        }
      }
    })

    setParsedResults(results)
  }

  return (
    <MainLayout>
      <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col px-4 pb-8 sm:px-6 lg:px-10">
        <header className="pb-5">
          <div className="flex flex-col gap-1.5 pt-5">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Workspace
            </p>
            <h1 className="font-serif text-3xl font-medium italic tracking-tight text-foreground sm:text-[2.375rem] sm:leading-tight">
              Email query + parser
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Fetch up to 20 emails for an ad-hoc Gmail query, run your parser
              function on each email, and inspect extracted key-value output as
              JSON.
            </p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg font-semibold tracking-tight">
                Input
              </CardTitle>
              <CardDescription>
                Configure query, fetch size, and parser code.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="playground-query">Query</Label>
                <Textarea
                  id="playground-query"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="subject:(statement OR receipt) newer_than:30d"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="playground-limit">
                  Number of emails (max 20)
                </Label>
                <Input
                  id="playground-limit"
                  type="number"
                  min={1}
                  max={20}
                  value={limitInput}
                  onChange={(event) => setLimitInput(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="playground-parser">
                  Parser JS: (email) =&gt; (&#123;...&#125;)
                </Label>
                <Textarea
                  id="playground-parser"
                  value={parserCode}
                  onChange={(event) => setParserCode(event.target.value)}
                  className="min-h-65 font-mono text-xs"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleFetch}
                  disabled={fetchMutation.isPending || !query.trim()}
                >
                  <Search className="mr-2 h-4 w-4" />
                  {fetchMutation.isPending ? 'Fetching...' : 'Fetch Emails'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRunParser}
                  disabled={!hasEmails}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Run Parser
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline">Fetched: {fetchedEmails.length}</Badge>
                {parsedResults.length > 0 ? (
                  <Badge variant="outline">
                    Parsed: {parsedResults.length}
                  </Badge>
                ) : null}
              </div>

              {fetchMutation.isError ? (
                <p className="text-sm text-destructive">
                  Failed to fetch emails. Please check your query and Gmail
                  connection.
                </p>
              ) : null}

              {parserCompileError ? (
                <p className="text-sm text-destructive">{parserCompileError}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg font-semibold tracking-tight">
                JSON Output
              </CardTitle>
              <CardDescription>
                Shows fetched emails initially, then parsed key-value results
                after running parser code.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-155 rounded-md border">
                <pre className="max-w-full p-4 font-mono text-xs leading-5 whitespace-pre-wrap wrap-anywhere">
                  {JSON.stringify(output, null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
