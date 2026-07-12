import { describe, expect, it, beforeEach } from 'vitest'
import { createDefaultScenario } from '@workspace/domain'
import {
  clearActiveDraft,
  deserializeScenarioFromUrl,
  readActiveDraft,
  resolveInitialScenario,
  serializeScenarioToUrl,
  writeActiveDraft,
} from '../lib/scenario-serialization'

describe('scenario-serialization', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips scenario through URL compression', () => {
    const scenario = createDefaultScenario({ name: 'Test Scenario' })
    const encoded = serializeScenarioToUrl(scenario)
    const restored = deserializeScenarioFromUrl(encoded)

    expect(restored).not.toBeNull()
    expect(restored?.name).toBe('Test Scenario')
    expect(restored?.basicSIP.amount).toBe(scenario.basicSIP.amount)
  })

  it('persists and restores active draft from localStorage', () => {
    const scenario = createDefaultScenario({
      multiAsset: {
        enabled: true,
        assetClasses: [
          {
            id: 'eq',
            name: 'Indian Equity',
            order: 0,
            currentValue: 800_000,
            monthlyInvestment: 50_000,
            expectedReturn: 12,
          },
        ],
      },
    })

    writeActiveDraft(scenario)
    const restored = readActiveDraft()

    expect(restored?.multiAsset.assetClasses[0]?.currentValue).toBe(800_000)
    expect(restored?.multiAsset.assetClasses[0]?.monthlyInvestment).toBe(50_000)

    clearActiveDraft()
    expect(readActiveDraft()).toBeNull()
  })

  it('resolveInitialScenario prefers URL over draft', () => {
    const draft = createDefaultScenario({ basicSIP: { frequency: 'monthly', amount: 99_999, durationValue: 10, durationUnit: 'years', annualReturn: 12 } })
    writeActiveDraft(draft)

    const shared = createDefaultScenario({ basicSIP: { frequency: 'monthly', amount: 1000, durationValue: 5, durationUnit: 'years', annualReturn: 8 } })
    const encoded = serializeScenarioToUrl(shared)
    const params = new URLSearchParams({ s: encoded })

    const resolved = resolveInitialScenario(params)
    expect(resolved.basicSIP.amount).toBe(1000)
  })

  it('resolveInitialScenario falls back to draft when no URL', () => {
    const draft = createDefaultScenario({
      basicSIP: {
        frequency: 'monthly',
        amount: 42_000,
        durationValue: 10,
        durationUnit: 'years',
        annualReturn: 12,
      },
    })
    writeActiveDraft(draft)

    const resolved = resolveInitialScenario(new URLSearchParams())
    expect(resolved.basicSIP.amount).toBe(42_000)
  })
})
