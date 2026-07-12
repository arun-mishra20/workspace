import type { AiAssistantPageContext } from '@/features/ai-assistant/api/assistant'
import type { ProjectionResult, ProjectionScenario } from '@workspace/domain'

type ProjectionsPageContextInput = {
  scenario: ProjectionScenario
  result: ProjectionResult
}

export function buildProjectionsPageContext(
  input: ProjectionsPageContextInput,
): AiAssistantPageContext {
  return {
    pageId: 'investment-projections',
    title: 'Investment Projections',
    route: '/projections',
    description:
      'Interactive investment projection calculator with SIP, multi-asset, inflation, and scenario analysis.',
    filters: {
      inflationEnabled: input.scenario.inflation.enabled,
      stepUpEnabled: input.scenario.stepUp.enabled,
      multiAssetEnabled: input.scenario.multiAsset.enabled,
      monteCarloEnabled: input.scenario.monteCarlo.enabled,
    },
    dataSnapshot: {
      visibleWidgets: [
        'kpi-cards',
        'growth-chart',
        'allocation',
        'milestones',
        'insights',
      ],
      summary: {
        sipAmount: input.scenario.basicSIP.amount,
        duration: input.scenario.basicSIP.durationValue,
        annualReturn: input.scenario.basicSIP.annualReturn,
        finalCorpus: input.result.summary.finalCorpus,
        cagr: input.result.summary.cagr,
        wealthMultiplier: input.result.summary.wealthMultiplier,
        nextMilestone:
          input.result.summary.finalCorpus < 10_000_000
            ? '1 Crore'
            : '5 Crore',
      },
    },
  }
}
