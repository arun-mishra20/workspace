import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Briefcase,
  Compass,
  CornerDownLeft,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Plane,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { type ComponentType, useEffect, useRef, useState } from 'react'

import {
  getAiAssistantStatus,
  type AiAssistantStatus,
} from '@/features/ai-assistant/api/assistant'
import { useAiAssistant } from '@/features/ai-assistant/ai-assistant-context'
import { AssistantAnalysisTrace } from '@/features/ai-assistant/components/assistant-analysis-trace'
import { AssistantFeedback } from '@/features/ai-assistant/components/assistant-feedback'
import { AssistantMessage } from '@/features/ai-assistant/components/assistant-message'
import { ConversationSidebar } from '@/features/ai-assistant/components/conversation-sidebar'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'
import { Textarea } from '@workspace/ui/components/ui/textarea'

type PromptCard = {
  category: string
  Icon: ComponentType<{ className?: string }>
  prompt: string
}

const PROMPT_CARDS: PromptCard[] = [
  {
    category: 'Holdings',
    Icon: Briefcase,
    prompt:
      'What are my top three holdings by current value and how are they allocated?',
  },
  {
    category: 'Travel',
    Icon: Plane,
    prompt:
      'Infer the strongest travel operating pattern from flights and hotels together.',
  },
  {
    category: 'Finance',
    Icon: TrendingUp,
    prompt:
      'Which platform has the highest allocation and what does that imply?',
  },
  {
    category: 'Explore',
    Icon: Compass,
    prompt:
      'What should I investigate next across my finances and travel data?',
  },
]

export function DashboardChat() {
  const { messages, isSending, error, sendMessage, startNewConversation } =
    useAiAssistant()
  const [draft, setDraft] = useState('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const prevSendingRef = useRef(isSending)

  const statusQuery = useQuery({
    queryKey: ['ai-assistant', 'status'],
    queryFn: getAiAssistantStatus,
    staleTime: 30_000,
    retry: false,
  })

  useEffect(() => {
    if (prevSendingRef.current && !isSending) {
      void queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
    }
    prevSendingRef.current = isSending
  }, [isSending, queryClient])

  useEffect(() => {
    if (!statusQuery.data?.available) {
      setSelectedModel('')
      return
    }

    const availableModels = statusQuery.data.models
    if (availableModels.length === 0) {
      setSelectedModel('')
      return
    }

    setSelectedModel((current) => {
      if (current && availableModels.includes(current)) return current
      if (
        statusQuery.data.defaultModel &&
        availableModels.includes(statusQuery.data.defaultModel)
      ) {
        return statusQuery.data.defaultModel
      }
      return availableModels[0] ?? ''
    })
  }, [statusQuery.data])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, isSending])

  const available = statusQuery.data?.available ?? false

  const handleSubmit = async () => {
    const trimmed = draft.trim()
    if (!trimmed || isSending || !available) return
    setDraft('')
    await sendMessage(trimmed, selectedModel || undefined)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      void handleSubmit()
    }
  }

  const hasMessages = messages.length > 0

  const sidebarToggle = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8"
      onClick={() => setSidebarOpen((o) => !o)}
      aria-label={sidebarOpen ? 'Hide threads' : 'Show threads'}
    >
      {sidebarOpen ? (
        <PanelLeftClose className="size-4" />
      ) : (
        <PanelLeftOpen className="size-4" />
      )}
    </Button>
  )

  const newChatButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8"
      onClick={startNewConversation}
      aria-label="New conversation"
    >
      <Plus className="size-3.5" />
    </Button>
  )

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      {sidebarOpen ? <ConversationSidebar /> : null}

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {!hasMessages ? (
          <>
            <div className="shrink-0 px-4 pt-6 sm:px-6">
              <div className="mx-auto flex w-full max-w-3xl items-start justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Workspace
                  </p>
                  <h1 className="font-serif text-3xl font-medium italic tracking-tight text-foreground sm:text-[2.375rem] sm:leading-tight">
                    What would you like to explore?
                  </h1>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    Ask about your holdings, expenses, flights, hotels, or
                    uncover patterns across your personal data.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 pt-1">
                  {sidebarToggle}
                  {newChatButton}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-8 sm:px-6">
              <div className="w-full max-w-3xl space-y-8 text-center">
                <div className="space-y-3">
                  <div className="flex items-center justify-center">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                      <Sparkles className="size-5 text-primary" />
                    </div>
                  </div>
                  <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Choose a prompt below or type your own question to get
                    started.
                  </p>
                </div>

                <div className="mx-auto grid max-w-xl grid-cols-2 gap-3">
                  {PROMPT_CARDS.map(({ category, Icon, prompt }) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() =>
                        void sendMessage(prompt, selectedModel || undefined)
                      }
                      disabled={isSending || !available}
                      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {category}
                        </span>
                        <Icon className="ml-auto size-3.5 text-muted-foreground" />
                      </div>
                      <p className="text-sm leading-snug text-foreground">
                        {prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 px-4 sm:px-6">
              <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
                {sidebarToggle}
                <div className="flex items-center gap-2">
                  {statusQuery.data?.available &&
                    statusQuery.data.models.length > 0 && (
                      <Select
                        value={selectedModel}
                        onValueChange={setSelectedModel}
                        disabled={isSending}
                      >
                        <SelectTrigger className="h-7 w-auto max-w-[180px] border-border/50 bg-muted/40 text-xs">
                          <SelectValue placeholder="Model" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusQuery.data.models.map((model) => (
                            <SelectItem
                              key={model}
                              value={model}
                              className="text-xs"
                            >
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  {newChatButton}
                </div>
              </div>
            </div>

            <div
              ref={scrollContainerRef}
              className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6"
            >
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-6">
                {messages.map((message) => (
                  <div key={message.id}>
                    {message.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-[88%] rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground sm:max-w-[80%]">
                          <div className="whitespace-pre-wrap leading-6">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card">
                          <Sparkles className="size-3.5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-3 pt-0.5 text-sm">
                          <AssistantMessage
                            content={message.content}
                            isStreaming={message.isStreaming}
                            activeTools={message.activeTools}
                            onSuggestedAction={(action) =>
                              void sendMessage(
                                action,
                                selectedModel || undefined,
                              )
                            }
                          />
                          {!message.isStreaming && (
                            <>
                              <AssistantFeedback messageId={message.id} />
                              <AssistantAnalysisTrace
                                analysis={message.analysis}
                                toolsUsed={message.toolsUsed}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {error ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </>
        )}

        <DashboardComposer
          draft={draft}
          isSending={isSending}
          available={available}
          selectedModel={selectedModel}
          setDraft={setDraft}
          setSelectedModel={setSelectedModel}
          onKeyDown={handleKeyDown}
          onSubmit={handleSubmit}
          statusQuery={statusQuery}
          compact={hasMessages}
        />
      </div>
    </div>
  )
}

type DashboardComposerProps = {
  draft: string
  isSending: boolean
  available: boolean
  selectedModel: string
  setDraft: (value: string) => void
  setSelectedModel: (value: string) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSubmit: () => Promise<void>
  statusQuery: {
    data?: AiAssistantStatus
    isLoading: boolean
  }
  compact?: boolean
}

function DashboardComposer({
  draft,
  isSending,
  available,
  selectedModel,
  setDraft,
  setSelectedModel,
  onKeyDown,
  onSubmit,
  statusQuery,
  compact = false,
}: DashboardComposerProps) {
  return (
    <div className="shrink-0 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-6 sm:py-4">
      <div className="mx-auto w-full max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              compact
                ? 'Ask a follow-up question…'
                : 'Ask anything about your data…'
            }
            rows={compact ? 2 : 3}
            disabled={isSending || !available}
            className="min-h-[80px] resize-none border-0 bg-transparent px-4 pb-2 pt-4 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:px-5"
          />
          <div className="flex items-center justify-between border-t border-border/60 px-3 py-2.5">
            {statusQuery.data?.available &&
            statusQuery.data.models.length > 0 ? (
              <Select
                value={selectedModel}
                onValueChange={setSelectedModel}
                disabled={isSending}
              >
                <SelectTrigger className="h-7 w-auto max-w-[180px] border-border/50 bg-muted/40 text-xs">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  {statusQuery.data.models.map((model) => (
                    <SelectItem key={model} value={model} className="text-xs">
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-xs text-muted-foreground">
                {statusQuery.isLoading
                  ? 'Checking OpenWire…'
                  : statusQuery.data?.available
                    ? `OpenWire ready · ${statusQuery.data.defaultModel}`
                    : 'OpenWire unavailable'}
              </span>
            )}

            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:block">
                ⌘↵
              </span>
              <Button
                type="button"
                size="icon"
                onClick={() => void onSubmit()}
                disabled={!draft.trim() || isSending || !available}
                className="size-8 rounded-xl"
              >
                {isSending ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <CornerDownLeft className="size-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
