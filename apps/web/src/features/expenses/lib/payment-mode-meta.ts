import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  CreditCard,
  Landmark,
  Smartphone,
  Zap,
} from 'lucide-react'

import { getChartTokenColor } from '@/features/expenses/components/analytics/analytics-utils'

export interface PaymentModeMeta {
  label: string
  color: string
  icon: LucideIcon
}

const PAYMENT_MODE_META: Record<string, PaymentModeMeta> = {
  upi: {
    label: 'UPI',
    color: 'var(--color-chart-3)',
    icon: Smartphone,
  },
  credit_card: {
    label: 'Credit Card',
    color: 'var(--color-chart-1)',
    icon: CreditCard,
  },
  neft: {
    label: 'NEFT',
    color: 'var(--color-chart-2)',
    icon: Building2,
  },
  imps: {
    label: 'IMPS',
    color: 'var(--color-chart-4)',
    icon: Zap,
  },
  rtgs: {
    label: 'RTGS',
    color: 'var(--color-chart-5)',
    icon: Landmark,
  },
}

export function getPaymentModeMeta(
  mode: string,
  fallbackIndex = 0,
): PaymentModeMeta {
  return (
    PAYMENT_MODE_META[mode] ?? {
      label: mode.replace(/_/g, ' '),
      color: getChartTokenColor(fallbackIndex),
      icon: CreditCard,
    }
  )
}

export function getPaymentModeColor(mode: string, fallbackIndex = 0): string {
  return getPaymentModeMeta(mode, fallbackIndex).color
}

export function getPaymentModeLabel(mode: string): string {
  return getPaymentModeMeta(mode).label
}
