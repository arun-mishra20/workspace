# OpenWire AI Assistant Audit & Upgrade Plan

## Current Setup Audit
- No dedicated assistant module exists in `apps/api` or `apps/web`; the only LLM usage is the single-step Gemini fallback inside the flights extractor (`apps/api/src/modules/flights`) and a basic email playground UI.
- Tooling is reactive and single-shot: API endpoints expose domain data (expenses, flights, dividends, holdings, principal), but there is no planner, no multi-tool chaining, and no reusable tool registry.
- Reasoning is absent: no hypothesis generation, iterative querying, or self-evaluation. LLM calls are invoked directly without guards, retries, or reflection loops.
- Memory/state: conversations, hypotheses, and intermediate results are not persisted; users cannot inspect past analyses or rerun improved queries.
- UI: the playground and existing pages do not surface tool calls, intermediate insights, or approval gates; the experience looks like a basic form rather than an analytical agent.

## Architectural Improvements (Feasible on the Existing Stack)
- **Assistant Orchestrator (Nest module):** Add `apps/api/src/modules/assistant/` with presentation (controller for session endpoints and streaming), application (planner/executor services), domain (plans, steps, tool calls), and infrastructure (LLM/web-search/tool adapters). Reuse existing config/env patterns and the domain events module for auditing.
- **Planner + Executor:** Introduce a lightweight planner that turns user intent into a step list, then iteratively executes: plan → pick tool → call → score → refine. Start with a rule-based planner seeded by metadata about tools; allow LLM-assisted planning as an optional path.
- **Tool Registry:** Define typed tool interfaces in `application/ports/` (e.g., ExpensesAnalyticsTool, FlightsStatusTool, HoldingsInsightsTool, WebSearchTool) and register concrete adapters in `infrastructure/`. Tools should be idempotent, parameterized, and return structured JSON.
- **Memory & State:** Store assistant sessions, messages, tool invocations, and artifacts in new tables (via `packages/database` with migrations). Expose session resume/replay APIs and attach request IDs for traceability.
- **Guardrails & Policies:** Add execution budgets (max tool calls, max tokens), schema validation (Zod on inputs/outputs), safety filters for web results, and configurable allowlists for tools requiring explicit user approval.
- **Observability:** Log step-level traces (tool, latency, outcome) using the existing Pino setup; emit domain events for analytics and offline evaluation.

## Reasoning & Execution Workflow
1. **Intent parse:** Normalize the user ask, classify intent (expenses, flights, holdings, dividends, general), and detect required data domains.
2. **Capability match:** Map intent to available tools with required params and estimated cost/latency.
3. **Plan draft:** Generate a short ordered plan (hypotheses + tool calls). Example: build expenses hypothesis → fetch aggregates → fetch outliers → cross-check with holdings.
4. **Iterative loop:** For each step, call tool → validate output → update working memory → decide next step (continue, refine query, branch, or stop). Allow loop to terminate early on sufficient confidence.
5. **Synthesis:** Merge multi-source results, highlight conflicts, and compute derived insights (trends, anomalies, correlations).
6. **Finalization:** Produce an answer with provenance (which tools, timestamps, counts) plus suggestions for follow-up queries.

## Tooling & Data Access Strategy
- **Expenses tools:** Query spending by category/merchant/time, detect anomalies, fetch raw email excerpts (via `expenses` + `playground` endpoints), and summarize recurring payments.
- **Flights tools:** Current extraction pipeline + statuses; add a tool to list recent flight activities, LLM review backlog, and map overlays.
- **Holdings & Dividends tools:** Fetch portfolio positions, P&L, dividend yields, and cashflow projections.
- **Principal/Accounts tools:** Basic user/account context to personalize results and enforce access control.
- **Cross-cutting tools:** Web search (for contextual data like airline delays, merchant info), math/stats helpers (percentiles, regressions using lodash/date-fns), and summarizers.
- **Execution rules:** Each tool returns typed JSON with a `source` tag; planner prefers lowest-cost tool first and retries with narrower params before escalating to LLM/web.

## UI / UX Enhancements (React 19 + Vite)
- **Execution timeline:** Show ordered steps with status (planned → running → done/failed), tool names, and durations; allow expanding to view inputs/outputs.
- **Intermediate insights drawer:** Surface hypotheses, partial findings, and confidence scores before finalizing.
- **User approvals:** For expensive or external calls (LLM/web), present a gating prompt with estimated cost and data to be sent.
- **Query builder assists:** Suggest follow-up prompts based on current results (e.g., “Drill into merchants over $500 this month”).
- **History & replay:** Persist session list with filters; allow reopening a past session and continuing the analysis.
- **Accessibility & theming:** Reuse `@workspace/ui` primitives; keep reasoning panes responsive and keyboard-navigable.

## Feasibility Notes & Risks
- **Planner/executor:** Feasible with Nest services and small state machine; start rule-based to avoid heavy dependencies. Risk: complexity creep—mitigate with strict tool schemas and budgets.
- **Tool adapters:** Straightforward wrappers around existing modules/endpoints; risk is overfetching. Mitigate with pagination and column selection.
- **LLM/Web search:** Already precedent via Gemini in flights; add provider abstraction. Risk: cost/leakage—enforce allowlists, redact PII, and cache safe responses.
- **Memory layer:** Requires new tables and migrations; ensure soft limits (session TTL, artifact size caps) and background cleanup.
- **UI:** Vite/React stack supports streaming and step views. Risk: clutter—gate advanced details behind accordions and sensible defaults.

## Testing Strategy
- **Unit:** Planner policies, tool selection, guardrails (budgets, schema validation), and synthesis logic.
- **Integration:** End-to-end assistant run against mock tool adapters; deterministic fixtures for expenses/flights/holdings data.
- **Contract:** Tool adapter schemas vs. domain APIs to prevent drift.
- **E2E (Playwright):** Happy-path and approval-gated flows using `gpt-5-mini` only; mock LLM/web calls to avoid flakiness.
- **Observability checks:** Snapshots of step traces and provenance payloads to ensure logging stays consistent.

## Implementation Suggestions & Next Steps
1. Stand up `assistant` Nest module with tool registry, planner, and executor skeleton; expose session create/run endpoints (streaming friendly).
2. Wrap existing domain capabilities as tools (expenses summary, flight activity, holdings snapshot, dividends timeline) plus a web search adapter.
3. Add persistence for sessions/tool calls and expose a history endpoint.
4. Build a React “Analysis Session” page with timeline, approvals, and intermediate insights panels; reuse `@workspace/ui` cards/accordions/tabs.
5. Add guardrails (budgets, schema validation) and tracing to Pino + domain events.
6. Backfill tests: planner selection, tool adapter mocks, and Playwright smoke of the session UI (using `gpt-5-mini` during Playwright runs).
