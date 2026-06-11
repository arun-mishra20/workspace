import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export type CreditCardStatus = 'active' | 'upgraded'

export interface CreditCardTracking {
  primary_card?: boolean
  legacy_card?: boolean
  optimize_for?: string[]
}

export type CreditCardBenefits = Record<string, number | boolean>

export interface CreditCardConfig {
  type: string
  name: string
  bank: string
  icon: string
  last_four_digits: string
  network?: string
  card_tier?: string
  image_key?: string
  status?: CreditCardStatus
  upgraded_to?: string
  upgraded_from?: string
  annual_fee?: number
  reward_currency?: string
  tracking?: CreditCardTracking
  benefits?: CreditCardBenefits
  milestones: Record<
    string,
    {
      type: string
      description: string
      amount: number
      reward_points?: number
      durations: string[]
      milestone_start_date?: string
      milestone_end_date?: string
    }
  >
}

export interface ResolvedCard {
  cardLast4: string
  cardName: string
  bank: string
  icon: string
  network?: string
  cardTier?: string
  imageKey?: string
  status: CreditCardStatus
  upgradedTo?: string
  upgradedFrom?: string
  annualFee?: number
  rewardCurrency?: string
  tracking?: CreditCardTracking
  benefits?: CreditCardBenefits
  milestones: CreditCardConfig['milestones']
}

/**
 * Resolves credit card last-4 digits to card name, bank & metadata
 * using the credit_cards.json configuration file.
 */
export class CardResolver {
  private static instance: CardResolver | null = null

  static getInstance(): CardResolver {
    if (!this.instance) {
      this.instance = new CardResolver()
    }
    return this.instance
  }

  /** Map from last-4 digits → card metadata */
  private readonly cardMap: Map<string, ResolvedCard>

  private constructor() {
    this.cardMap = this.loadCardConfig()
  }

  /**
     * Resolve a last-4 digit string to the card's display name.
     * Returns undefined if the card is not in the config.
     */
  resolve(last4: string | null | undefined): ResolvedCard | undefined {
    if (!last4) return undefined
    return this.cardMap.get(last4)
  }

  /**
     * Resolve just the card display name for a given last-4 digits.
     * Falls back to "Card ••{last4}" if not found in config.
     */
  resolveCardName(last4: string | null | undefined): string | undefined {
    if (!last4) return undefined
    const card = this.cardMap.get(last4)
    return card?.cardName ?? `Card ••${last4}`
  }

  /** Get all configured cards (for analytics enrichment) */
  getAllCards(): Map<string, ResolvedCard> {
    return this.cardMap
  }

  /** List all configured cards sorted active-first, primary card next, then by name */
  listAllCards(): ResolvedCard[] {
    return [...this.cardMap.values()].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'active' ? -1 : 1
      }
      const aPrimary = a.tracking?.primary_card ?? false
      const bPrimary = b.tracking?.primary_card ?? false
      if (aPrimary !== bPrimary) {
        return aPrimary ? -1 : 1
      }
      return a.cardName.localeCompare(b.cardName)
    })
  }

  private loadCardConfig(): Map<string, ResolvedCard> {
    const moduleDir = dirname(fileURLToPath(import.meta.url))
    const candidatePaths = [
      join(moduleDir, 'config', 'credit_cards.json'),
      join(moduleDir, '..', 'categorization', 'config', 'credit_cards.json'),
      join(
        process.cwd(),
        'src/modules/expenses/infrastructure/categorization/config/credit_cards.json',
      ),
    ]

    for (const p of candidatePaths) {
      if (existsSync(p)) {
        const raw = JSON.parse(readFileSync(p, 'utf8')) as Record<
          string,
          CreditCardConfig
        >
        const map = new Map<string, ResolvedCard>()

        for (const [_key, card] of Object.entries(raw)) {
          map.set(card.last_four_digits, {
            cardLast4: card.last_four_digits,
            cardName: card.name,
            bank: card.bank,
            icon: card.icon,
            network: card.network,
            cardTier: card.card_tier,
            imageKey: card.image_key,
            status: card.status ?? 'active',
            upgradedTo: card.upgraded_to,
            upgradedFrom: card.upgraded_from,
            annualFee: card.annual_fee,
            rewardCurrency: card.reward_currency,
            tracking: card.tracking,
            benefits: card.benefits,
            milestones: card.milestones,
          })
        }

        return map
      }
    }

    // Return empty map if config not found (graceful degradation)
    return new Map()
  }
}
