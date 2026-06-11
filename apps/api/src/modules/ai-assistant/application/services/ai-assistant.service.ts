import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { AI_CHAT_PROVIDER } from '@/modules/ai-assistant/application/ports/ai-chat-provider.port'
import { AiToolRegistryService } from '@/modules/ai-assistant/application/services/ai-tool-registry.service'

import type { Env } from '@/app/config/env.schema'
import type {
  AiChatProvider,
  AiChatProviderMessage,
  AiChatProviderToolCall,
  AiChatProviderToolDefinition,
} from '@/modules/ai-assistant/application/ports/ai-chat-provider.port'
import type { AiAssistantChatRequest } from '@/modules/ai-assistant/presentation/dtos/ai-assistant.schema'

export type AiAssistantAnalysisStep = {
  id: string
  type: 'prefetch' | 'observation' | 'tool-call' | 'final'
  title: string
  summary: string
  status: 'completed' | 'failed'
  toolName?: string
  toolArgs?: unknown
  resultData?: unknown
  resultPreview?: string
}

export type AiAssistantAnalysis = {
  status: 'completed'
  totalToolRounds: number
  toolsUsed: string[]
  steps: AiAssistantAnalysisStep[]
}

export type AiStreamEvent =
  | { type: 'token'; content: string }
  | { type: 'tool-start'; toolName: string; toolCallId: string }
  | { type: 'tool-result'; toolCallId: string; toolName: string; ok: boolean; preview: string }
  | { type: 'step'; step: AiAssistantAnalysisStep }
  | { type: 'done'; message: string; model: string; toolsUsed: string[]; analysis: AiAssistantAnalysis; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }
  | { type: 'error'; message: string }

// Behavioral constraints and reasoning rules. Constraints are front-loaded so
// the model encounters them before elaborations.
const BEHAVIORAL_SYSTEM_PROMPT = [
  'You are an analytics assistant for a personal operations dashboard.',
  '',
  'HARD CONSTRAINTS — never violate:',
  '- Do not claim to see hidden rows, raw records, or charts not returned by tools.',
  '- Do not imply access to real-time prices, current filings, breaking news, or post-training events unless a tool explicitly returned that information.',
  '- Do not rely on frontend page snapshots as ground truth. Always verify with backend tools.',
  '- Never call the same tool with the same arguments more than once per conversation turn.',
  '- After 2–3 tool calls, if the needed data dimension is absent from every _meta.provides, stop — the data does not exist in the database.',
  '',
  'REASONING:',
  'For analytical questions: identify what needs testing → call the right tools → inspect results → conclude.',
  'For broad or cross-domain questions: form short hypotheses → test with tools → compare evidence → synthesize.',
  'Use capability-discovery tools when unsure which tool or analytics shape is best.',
  'If the first tool result is incomplete, try one refinement or alternative — then synthesize with what you have.',
  'When tool results already cover the question, respond immediately without additional tool calls.',
  '',
  'GENERAL KNOWLEDGE:',
  'Use world knowledge for qualitative explanation, business context, sector tailwinds, and common risk factors.',
  'Label it clearly as "general market context" or "qualitative reasoning" — never as live portfolio data.',
  'For dimensions absent from _meta.provides (sector, geography, market-cap, risk profile, lifestyle category), infer from raw data fields and label as "based on general knowledge".',
  '',
  'DATA & TOOLS:',
  'When a question needs holdings, dividends, expenses, flights, or hotels, use the relevant tools before answering.',
  'Prefer multiple focused tool calls over one vague query when that produces better evidence.',
  'Prefer concise, high-signal answers with observations, anomalies, trends, risks, and next steps.',
  'Present conclusions as evidence followed by interpretation.',
  'Use short markdown sections or bullets when useful.',
  'If data is incomplete, state what is missing — but still provide the best bounded qualitative view.',
].join('\n')

// Structured output format specs in a separate message to avoid mixing format
// mechanics with behavioral reasoning rules.
const STRUCTURED_OUTPUT_PROMPT = [
  'STRUCTURED OUTPUT — follow these formats exactly:',
  '',
  'FOLLOW-UP QUESTIONS: End every response with 2–4 follow-up suggestions:',
  ':::actions',
  'What is my expense trend over the last quarter?',
  'How does my dividend income compare year over year?',
  ':::',
  '',
  'KEY METRICS: Use :::metric for single values only:',
  ':::metric',
  '{"label":"Total Portfolio Value","value":"₹12,45,000","trend":"up","change":"+8.2%"}',
  ':::',
  '',
  'DATA CHARTS: Use :::chart when presenting data across 3+ categories or time periods, or when asked to "show", "visualize", "compare", or "break down". Never for single values.',
  '',
  'Bar / line / area format:',
  ':::chart',
  '{"type":"bar","title":"Expense by Category","xKey":"category","data":[{"category":"Food","amount":12000},{"category":"Travel","amount":8000}],"series":[{"key":"amount","label":"Amount (₹)"}]}',
  ':::',
  '',
  'Pie chart format (max 6 slices):',
  ':::chart',
  '{"type":"pie","title":"Expense Allocation","data":[{"label":"Food","value":12000},{"label":"Travel","value":8000}]}',
  ':::',
  '',
  'Chart type: bar=category comparison, line=time-series, area=cumulative, pie=allocation.',
  'Chart rules: numeric values only; xKey and series[].key must exactly match field names in data objects.',
  '',
  'DIAGRAMS: For non-numeric flows or relationships, use a mermaid fenced code block:',
  '```mermaid',
  'graph TD',
  '    A[Start] --> B[Step]',
  '```',
].join('\n')

const DEFAULT_MAX_TOOL_ROUNDS = 10
const MAX_CONTEXT_TOKENS = 12_000
const SUMMARIZATION_THRESHOLD = 10
const DATA_SNAPSHOT_MAX_CHARS = 1500

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function estimateMessageTokens(
  messages: AiChatProviderMessage[],
  toolDefinitions: AiChatProviderToolDefinition[] = [],
): number {
  let total = toolDefinitions.length > 0 ? estimateTokens(JSON.stringify(toolDefinitions)) : 0
  for (const msg of messages) {
    total += 4
    if (msg.content) total += estimateTokens(msg.content)
    if (msg.tool_calls) total += estimateTokens(JSON.stringify(msg.tool_calls))
  }
  return total
}

class ToolCallCache {
  private static readonly MAX_SIZE = 50

  private readonly cache = new Map<string, { ok: true; tool: string; result: unknown } | { ok: false; tool: string; error: string }>()

  private buildKey(name: string, args: string): string {
    try {
      const normalized = JSON.stringify(JSON.parse(args))
      return `${name}::${normalized}`
    } catch {
      return `${name}::${args}`
    }
  }

  get(name: string, args: string) {
    return this.cache.get(this.buildKey(name, args))
  }

  set(name: string, args: string, result: { ok: true; tool: string; result: unknown } | { ok: false; tool: string; error: string }) {
    const key = this.buildKey(name, args)
    this.cache.delete(key)
    this.cache.set(key, result)

    // Evict oldest entries when exceeding max size
    if (this.cache.size > ToolCallCache.MAX_SIZE) {
      const firstKey = this.cache.keys().next()
      if (!firstKey.done) this.cache.delete(firstKey.value)
    }
  }

  get size() {
    return this.cache.size
  }
}

type ToolCallOutcome = {
  toolCall: AiChatProviderToolCall
  result: { ok: true; tool: string; result: unknown } | { ok: false; tool: string; error: string }
  fromCache: boolean
  step: AiAssistantAnalysisStep
  resultPreview: string
}

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name)
  private readonly maxToolRounds: number

  constructor(
    @Inject(AI_CHAT_PROVIDER)
    private readonly aiChatProvider: AiChatProvider,
    private readonly aiToolRegistry: AiToolRegistryService,
    private readonly configService: ConfigService<Env, true>,
  ) {
    const envRounds = this.configService.get('OPENWIRE_MAX_TOOL_ROUNDS', { infer: true })
    this.maxToolRounds = envRounds ?? DEFAULT_MAX_TOOL_ROUNDS
  }

  async getStatus() {
    const baseUrl = this.configService.get('OPENWIRE_BASE_URL', { infer: true })
    const defaultModel = this.configService.get('OPENWIRE_MODEL', { infer: true })

    try {
      const models = await this.aiChatProvider.listModels()
      return {
        available: true,
        baseUrl,
        defaultModel,
        models,
      }
    } catch (error) {
      return {
        available: false,
        baseUrl,
        defaultModel,
        models: [] as string[],
        error: error instanceof Error ? error.message : 'Failed to reach OpenWire',
      }
    }
  }

  async chat(input: AiAssistantChatRequest, userId: string) {
    const tools = this.aiToolRegistry.getTools()
    const prefetchedEvidence = await this.buildPrefetchedEvidence(input, userId)
    const messages = this.buildMessages(input, prefetchedEvidence.messages)
    const model = input.model || this.configService.get('OPENWIRE_MODEL', { infer: true })
    const toolsUsed: string[] = [...prefetchedEvidence.toolsUsed]
    const analysisSteps: AiAssistantAnalysisStep[] = [...prefetchedEvidence.steps]
    const toolCache = new ToolCallCache()

    this.logger.debug(
      `AI chat request: ${JSON.stringify({
        userId,
        model,
        availableTools: tools.map((tool) => tool.function.name),
        messages: input.messages.map((message) => ({
          role: message.role,
          content: this.truncate(message.content, 1000),
        })),
      })}`,
    )

    let forceNoTools = false
    let synthesisMsgInjected = false

    for (let round = 0; round < this.maxToolRounds; round += 1) {
      const useToolsThisRound = !forceNoTools && round < this.maxToolRounds - 2
      const toolChoice = useToolsThisRound && tools.length > 0 ? 'auto' : 'none'

      const completion = await this.aiChatProvider.createChatCompletion({
        model,
        messages,
        tools: toolChoice === 'none' ? [] : tools,
        toolChoice,
      })

      if (!completion.toolCalls || completion.toolCalls.length === 0) {
        analysisSteps.push({
          id: `final-${round + 1}`,
          type: 'final',
          title: 'Synthesized response',
          summary: completion.content
            ? this.truncate(completion.content, 240)
            : 'No response generated.',
          status: 'completed',
        })

        this.logger.debug(
          `AI chat response: ${JSON.stringify({
            userId,
            model: completion.model,
            toolsUsed: [...new Set(toolsUsed)],
            usage: completion.usage,
            message: this.truncate(completion.content ?? 'No response generated.', 2000),
          })}`,
        )

        return {
          message: completion.content ?? 'No response generated.',
          model: completion.model,
          usage: completion.usage,
          toolsUsed: [...new Set(toolsUsed)],
          analysis: {
            status: 'completed',
            totalToolRounds: round + 1,
            toolsUsed: [...new Set(toolsUsed)],
            steps: analysisSteps,
          } satisfies AiAssistantAnalysis,
        }
      }

      messages.push(this.createAssistantToolCallMessage(completion.toolCalls, completion.content))

      if (completion.content?.trim()) {
        analysisSteps.push({
          id: `observation-${round + 1}`,
          type: 'observation',
          title: `Planning step ${round + 1}`,
          summary: this.truncate(completion.content, 240),
          status: 'completed',
        })
      }

      this.logger.debug(
        `AI tool call round: ${JSON.stringify({
          userId,
          round: round + 1,
          model: completion.model,
          toolCalls: completion.toolCalls.map((toolCall) => ({
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: this.truncate(toolCall.function.arguments, 1000),
          })),
          assistantMessage: this.truncate(completion.content ?? '', 1000),
        })}`,
      )

      const outcomes = await this.runToolCalls(completion.toolCalls, messages, toolCache, userId, 'chat')
      for (const { toolCall, step } of outcomes) {
        toolsUsed.push(toolCall.function.name)
        analysisSteps.push(step)
      }

      synthesisMsgInjected = this.injectSynthesisPromptOnce(outcomes, messages, synthesisMsgInjected, 'chat')
      if (synthesisMsgInjected) forceNoTools = true
    }

    this.logger.warn('AI assistant exceeded maximum tool-call rounds, returning partial result')

    return {
      message: 'I was unable to fully complete the analysis within the allowed number of tool-calling rounds. Here is what I gathered so far. Please try asking a more specific question.',
      model: input.model || this.configService.get('OPENWIRE_MODEL', { infer: true }),
      toolsUsed: [...new Set(toolsUsed)],
      analysis: {
        status: 'completed' as const,
        totalToolRounds: this.maxToolRounds,
        toolsUsed: [...new Set(toolsUsed)],
        steps: analysisSteps,
      },
    }
  }

  async *chatStream(input: AiAssistantChatRequest, userId: string): AsyncGenerator<AiStreamEvent> {
    const tools = this.aiToolRegistry.getTools()
    const prefetchedEvidence = await this.buildPrefetchedEvidence(input, userId)
    const messages = this.buildMessages(input, prefetchedEvidence.messages)
    const model: string = input.model || this.configService.get('OPENWIRE_MODEL', { infer: true })
    const toolsUsed: string[] = [...prefetchedEvidence.toolsUsed]
    const analysisSteps: AiAssistantAnalysisStep[] = [...prefetchedEvidence.steps]
    const toolCache = new ToolCallCache()

    for (const step of prefetchedEvidence.steps) {
      yield { type: 'step', step }
    }

    let fullContent = ''
    let lastUsage: AiStreamEvent & { type: 'done' } | undefined
    let forceNoTools = false
    let synthesisMsgInjected = false

    for (let round = 0; round < this.maxToolRounds; round += 1) {
      let roundContent = ''
      const roundToolCalls: AiChatProviderToolCall[] = []
      const toolCallArgBuilders = new Map<string, { id: string; name: string; arguments: string }>()
      let roundModel = model

      const useToolsThisRound = !forceNoTools && round < this.maxToolRounds - 2
      const toolChoice = useToolsThisRound && tools.length > 0 ? 'auto' : 'none'

      for await (const chunk of this.aiChatProvider.createStreamingChatCompletion({
        model,
        messages,
        tools: toolChoice === 'none' ? [] : tools,
        toolChoice,
      })) {
        switch (chunk.type) {
          case 'token': {
            roundContent += chunk.content
            yield { type: 'token', content: chunk.content }
            break
          }
          case 'tool-call-start': {
            toolCallArgBuilders.set(chunk.toolCall.id, {
              id: chunk.toolCall.id,
              name: chunk.toolCall.name,
              arguments: '',
            })
            yield { type: 'tool-start', toolName: chunk.toolCall.name, toolCallId: chunk.toolCall.id }
            break
          }
          case 'tool-call-args': {
            const builder = toolCallArgBuilders.get(chunk.toolCallId)
            if (builder) {
              builder.arguments += chunk.argumentsDelta
            }
            break
          }
          case 'done': {
            roundModel = chunk.model
            lastUsage = {
              type: 'done',
              message: '',
              model: chunk.model,
              toolsUsed: [],
              analysis: { status: 'completed', totalToolRounds: 0, toolsUsed: [], steps: [] },
              usage: chunk.usage,
            }
            break
          }
        }
      }

      for (const builder of toolCallArgBuilders.values()) {
        roundToolCalls.push({
          id: builder.id,
          type: 'function',
          function: { name: builder.name, arguments: builder.arguments },
        })
      }

      if (roundToolCalls.length === 0) {
        fullContent += roundContent
        analysisSteps.push({
          id: `final-${round + 1}`,
          type: 'final',
          title: 'Synthesized response',
          summary: fullContent ? this.truncate(fullContent, 240) : 'No response generated.',
          status: 'completed',
        })

        yield {
          type: 'done',
          message: fullContent || 'No response generated.',
          model: roundModel,
          toolsUsed: [...new Set(toolsUsed)],
          analysis: {
            status: 'completed',
            totalToolRounds: round + 1,
            toolsUsed: [...new Set(toolsUsed)],
            steps: analysisSteps,
          },
          usage: lastUsage?.usage,
        }
        return
      }

      messages.push(this.createAssistantToolCallMessage(roundToolCalls, roundContent || null))

      if (roundContent.trim()) {
        const observationStep: AiAssistantAnalysisStep = {
          id: `observation-${round + 1}`,
          type: 'observation',
          title: `Planning step ${round + 1}`,
          summary: this.truncate(roundContent, 240),
          status: 'completed',
        }
        analysisSteps.push(observationStep)
        yield { type: 'step', step: observationStep }
      }

      const outcomes = await this.runToolCalls(roundToolCalls, messages, toolCache, userId, 'stream')

      for (const { toolCall, step, result, resultPreview } of outcomes) {
        toolsUsed.push(toolCall.function.name)
        analysisSteps.push(step)
        yield { type: 'tool-result', toolCallId: toolCall.id, toolName: toolCall.function.name, ok: result.ok, preview: resultPreview }
        yield { type: 'step', step }
      }

      synthesisMsgInjected = this.injectSynthesisPromptOnce(outcomes, messages, synthesisMsgInjected, 'stream')
      if (synthesisMsgInjected) forceNoTools = true
    }

    yield {
      type: 'error',
      message: 'Assistant exceeded the maximum tool-call rounds.',
    }
  }

  private async runToolCalls(
    toolCalls: AiChatProviderToolCall[],
    messages: AiChatProviderMessage[],
    toolCache: ToolCallCache,
    userId: string,
    logTag: string,
  ): Promise<ToolCallOutcome[]> {
    const raw = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const cached = toolCache.get(toolCall.function.name, toolCall.function.arguments)
        if (cached) {
          this.logger.debug(`Tool call cache hit (${logTag}): ${toolCall.function.name}`)
          return { toolCall, result: cached, fromCache: true }
        }
        const result = await this.aiToolRegistry.executeTool(toolCall, { userId })
        toolCache.set(toolCall.function.name, toolCall.function.arguments, result)
        return { toolCall, result, fromCache: false }
      }),
    )

    return raw.map(({ toolCall, result, fromCache }) => {
      const parsedArguments = this.tryParseJson(toolCall.function.arguments)
      const resultPreview = result.ok ? this.summarizeToolResult(result.result) : result.error

      const step: AiAssistantAnalysisStep = {
        id: toolCall.id,
        type: 'tool-call',
        title: fromCache ? `Ran ${toolCall.function.name} (cached)` : `Ran ${toolCall.function.name}`,
        summary: result.ok
          ? `Executed ${toolCall.function.name} and captured structured evidence.${fromCache ? ' (served from session cache)' : ''}`
          : `Attempted ${toolCall.function.name}, but the tool returned an error.`,
        status: result.ok ? 'completed' : 'failed',
        toolName: toolCall.function.name,
        toolArgs: parsedArguments,
        resultData: result.ok ? result.result : { error: result.error },
        resultPreview,
      }

      this.logger.debug(
        `AI tool result${fromCache ? ' (cached)' : ''} (${logTag}): ${JSON.stringify({
          userId,
          tool: toolCall.function.name,
          result: this.truncate(JSON.stringify(result), 2000),
        })}`,
      )

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      })

      return { toolCall, result, fromCache, step, resultPreview: resultPreview ?? '' }
    })
  }

  private injectSynthesisPromptOnce(
    outcomes: ToolCallOutcome[],
    messages: AiChatProviderMessage[],
    alreadyInjected: boolean,
    logTag: string,
  ): boolean {
    const allCached = outcomes.length > 0 && outcomes.every(({ fromCache }) => fromCache)
    if (allCached && !alreadyInjected) {
      this.logger.debug(`All tool calls in ${logTag} round were cache hits — injecting synthesis prompt`)
      messages.push({
        role: 'system',
        content: 'All tool calls in this round returned previously cached results. Synthesize your answer now using the evidence you have. Do not call any more tools.',
      })
      return true
    }
    return alreadyInjected
  }

  private buildMessages(
    input: AiAssistantChatRequest,
    prefetchedMessages: AiChatProviderMessage[] = [],
  ): AiChatProviderMessage[] {
    const systemMessages: AiChatProviderMessage[] = [
      { role: 'system', content: BEHAVIORAL_SYSTEM_PROMPT },
      { role: 'system', content: STRUCTURED_OUTPUT_PROMPT },
    ]

    if (input.pageContext) {
      systemMessages.push({
        role: 'system',
        content: [
          `The user is currently viewing: "${input.pageContext.title}" (page: ${input.pageContext.pageId}, route: ${input.pageContext.route}).`,
          input.pageContext.description ? `Page description: ${input.pageContext.description}` : '',
          input.pageContext.filters ? `Active filters: ${JSON.stringify(input.pageContext.filters)}` : '',
          input.pageContext.dataSnapshot
            ? `Visible data snapshot: ${this.truncate(JSON.stringify(input.pageContext.dataSnapshot), DATA_SNAPSHOT_MAX_CHARS)}`
            : '',
          'Use this context to provide more relevant answers, but always verify with backend tools rather than relying solely on snapshot data.',
        ].filter(Boolean).join('\n'),
      })
    }

    const conversationMessages = this.manageConversationMemory(input.messages)

    return [
      ...systemMessages,
      ...prefetchedMessages,
      ...conversationMessages,
    ]
  }

  private manageConversationMemory(
    messages: AiChatProviderMessage[],
  ): AiChatProviderMessage[] {
    if (messages.length <= SUMMARIZATION_THRESHOLD) {
      return messages
    }

    const tools = this.aiToolRegistry.getTools()
    const totalTokens = estimateMessageTokens(messages, tools)
    if (totalTokens <= MAX_CONTEXT_TOKENS) {
      return messages
    }

    const recentCount = Math.min(6, messages.length)
    const recent = messages.slice(-recentCount)
    const older = messages.slice(0, -recentCount)

    const summaryParts: string[] = []
    let toolCallCount = 0
    for (const msg of older) {
      if (msg.role === 'user') {
        summaryParts.push(`User asked: ${this.truncate(msg.content ?? '', 120)}`)
      } else if (msg.role === 'assistant' && msg.content) {
        summaryParts.push(`Assistant answered: ${this.truncate(msg.content, 120)}`)
      } else if (msg.role === 'tool') {
        toolCallCount++
      }
    }

    const toolNote = toolCallCount > 0
      ? `\n(${toolCallCount} tool call/result pairs from earlier turns are omitted for context length.)`
      : ''

    const summaryMessage: AiChatProviderMessage = {
      role: 'system',
      content: `Summary of earlier conversation (${older.length} messages):${toolNote}\n${summaryParts.join('\n')}`,
    }

    this.logger.debug(
      `Conversation memory: compressed ${older.length} older messages into summary (${estimateTokens(summaryMessage.content!)} est. tokens). Keeping ${recentCount} recent messages.`,
    )

    return [summaryMessage, ...recent]
  }

  private async buildPrefetchedEvidence(
    input: AiAssistantChatRequest,
    userId: string,
  ): Promise<{ messages: AiChatProviderMessage[], toolsUsed: string[], steps: AiAssistantAnalysisStep[] }> {
    const latestUserMessage = [...input.messages]
      .reverse()
      .find((message) => message.role === 'user')

    if (!latestUserMessage) {
      return { messages: [], toolsUsed: [], steps: [] }
    }

    const intent = this.detectIntent(latestUserMessage.content)

    if (intent.type === 'holding-lookup' && intent.query) {
      return this.prefetchHolding(intent.query, userId)
    }

    if (intent.type === 'portfolio-overview') {
      return this.prefetchPortfolioSummary(userId)
    }

    if (intent.type === 'expense-summary') {
      return this.prefetchExpenseSummary(userId, intent.period)
    }

    return { messages: [], toolsUsed: [], steps: [] }
  }

  private detectIntent(content: string): {
    type: 'holding-lookup' | 'portfolio-overview' | 'expense-summary' | 'unknown'
    query?: string
    period?: string
  } {
    const normalized = content.replaceAll(/\s+/g, ' ').trim()
    const lower = normalized.toLowerCase()

    const holdingPatterns = [
      /analy(?:s|z)e\s+(.+?)(?:,|\.|\?| as per| in my| for my| tell me| give me| what| prospects| outlook| thesis| view| opinion| should)/i,
      /(?:prospects|outlook|view|opinion|thesis)\s+(?:for|on)\s+(.+?)(?:,|\.|\?| as per| in my| for my| tell me| give me| what| should)/i,
      /about\s+(.+?)(?:,|\.|\?| as per| in my| for my| tell me| give me| what| prospects| outlook| thesis| view| opinion| should)/i,
    ]

    for (const pattern of holdingPatterns) {
      const match = normalized.match(pattern)
      const extracted = match?.[1]?.trim()
      if (extracted) {
        return {
          type: 'holding-lookup',
          query: extracted.replaceAll(/^['"]|['"]$/g, '').trim()
        }
      }
    }

    const portfolioKeywords = ['portfolio', 'allocation', 'holdings', 'invested', 'investment', 'net worth']
    if (portfolioKeywords.some((kw) => lower.includes(kw))) {
      return { type: 'portfolio-overview' }
    }

    const expenseKeywords = ['expense', 'spending', 'spent', 'merchant', 'transaction', 'cost']
    if (expenseKeywords.some((kw) => lower.includes(kw))) {
      const periodMatch = lower.match(/\b(week|month|quarter|year)\b/)
      return { type: 'expense-summary', period: periodMatch?.[1] }
    }

    return { type: 'unknown' }
  }

  private async prefetchHolding(query: string, userId: string): Promise<{ messages: AiChatProviderMessage[], toolsUsed: string[], steps: AiAssistantAnalysisStep[] }> {
    try {
      const toolResult = await this.aiToolRegistry.executeTool(
        {
          id: 'prefetch-getHoldingDetails',
          type: 'function',
          function: {
            name: 'getHoldingDetails',
            arguments: JSON.stringify({ query }),
          },
        },
        { userId },
      )

      this.logger.debug(
        `AI prefetch holding result: ${JSON.stringify({
          userId, tool: 'getHoldingDetails', query,
          result: this.truncate(JSON.stringify(toolResult), 2000),
        })}`,
      )

      return {
        toolsUsed: ['getHoldingDetails'],
        steps: [{
          id: 'prefetch-getHoldingDetails',
          type: 'prefetch',
          title: 'Prefetched holding evidence',
          summary: `Ran getHoldingDetails before the main loop for "${query}".`,
          status: 'completed',
          toolName: 'getHoldingDetails',
          toolArgs: { query },
          resultData: toolResult,
          resultPreview: this.summarizeToolResult(toolResult),
        }],
        messages: [
          {
            role: 'system',
            content: [
              'A portfolio lookup has already been executed for the latest company-style question.',
              'Do not ask the user for basic holding details that are already present below.',
              'Do not blame current page context if the lookup misses; say the holding was not confirmed in portfolio tools and then give bounded qualitative reasoning when prospects were requested.',
            ].join('\n\n'),
          },
          {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: 'prefetch-getHoldingDetails',
              type: 'function',
              function: { name: 'getHoldingDetails', arguments: JSON.stringify({ query }) },
            }],
          },
          {
            role: 'tool',
            tool_call_id: 'prefetch-getHoldingDetails',
            content: JSON.stringify(toolResult),
          },
        ],
      }
    } catch (error) {
      this.logger.warn(`Prefetch getHoldingDetails failed: ${error instanceof Error ? error.message : String(error)}`)
      return { messages: [], toolsUsed: [], steps: [] }
    }
  }

  private async prefetchPortfolioSummary(userId: string): Promise<{ messages: AiChatProviderMessage[], toolsUsed: string[], steps: AiAssistantAnalysisStep[] }> {
    try {
      const toolResult = await this.aiToolRegistry.executeTool(
        {
          id: 'prefetch-getPortfolioSummary',
          type: 'function',
          function: { name: 'getPortfolioSummary', arguments: '{}' },
        },
        { userId },
      )

      return {
        toolsUsed: ['getPortfolioSummary'],
        steps: [{
          id: 'prefetch-getPortfolioSummary',
          type: 'prefetch',
          title: 'Prefetched portfolio summary',
          summary: 'Ran getPortfolioSummary before the main loop.',
          status: 'completed',
          toolName: 'getPortfolioSummary',
          toolArgs: {},
          resultData: toolResult,
          resultPreview: this.summarizeToolResult(toolResult),
        }],
        messages: [
          {
            role: 'system',
            content: 'A portfolio summary has already been fetched. Use the data below as baseline evidence. Call additional tools only if deeper analysis is needed.',
          },
          {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: 'prefetch-getPortfolioSummary',
              type: 'function',
              function: { name: 'getPortfolioSummary', arguments: '{}' },
            }],
          },
          {
            role: 'tool',
            tool_call_id: 'prefetch-getPortfolioSummary',
            content: JSON.stringify(toolResult),
          },
        ],
      }
    } catch (error) {
      this.logger.warn(`Prefetch getPortfolioSummary failed: ${error instanceof Error ? error.message : String(error)}`)
      return { messages: [], toolsUsed: [], steps: [] }
    }
  }

  private async prefetchExpenseSummary(userId: string, period = 'month'): Promise<{ messages: AiChatProviderMessage[], toolsUsed: string[], steps: AiAssistantAnalysisStep[] }> {
    try {
      const toolResult = await this.aiToolRegistry.executeTool(
        {
          id: 'prefetch-getExpenseSummary',
          type: 'function',
          function: { name: 'getExpenseSummary', arguments: JSON.stringify({ period }) },
        },
        { userId },
      )

      return {
        toolsUsed: ['getExpenseSummary'],
        steps: [{
          id: 'prefetch-getExpenseSummary',
          type: 'prefetch',
          title: 'Prefetched expense summary',
          summary: `Ran getExpenseSummary for period "${period}" before the main loop.`,
          status: 'completed',
          toolName: 'getExpenseSummary',
          toolArgs: { period },
          resultData: toolResult,
          resultPreview: this.summarizeToolResult(toolResult),
        }],
        messages: [
          {
            role: 'system',
            content: `An expense summary for the "${period}" period has already been fetched. Use the data below as baseline evidence.`,
          },
          {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: 'prefetch-getExpenseSummary',
              type: 'function',
              function: { name: 'getExpenseSummary', arguments: JSON.stringify({ period }) },
            }],
          },
          {
            role: 'tool',
            tool_call_id: 'prefetch-getExpenseSummary',
            content: JSON.stringify(toolResult),
          },
        ],
      }
    } catch (error) {
      this.logger.warn(`Prefetch getExpenseSummary failed: ${error instanceof Error ? error.message : String(error)}`)
      return { messages: [], toolsUsed: [], steps: [] }
    }
  }

  private createAssistantToolCallMessage(
    toolCalls: AiChatProviderToolCall[],
    content: string | null,
  ): AiChatProviderMessage {
    return {
      role: 'assistant',
      content,
      tool_calls: toolCalls,
    }
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value
    }

    return `${value.slice(0, maxLength)}... [truncated]`
  }

  private tryParseJson(value: string): unknown {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  private summarizeToolResult(value: unknown): string {
    return this.truncate(JSON.stringify(value), 320)
  }
}
