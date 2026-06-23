import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  ArrowLeftRight,
  Banknote,
  Briefcase,
  Car,
  ChartLine,
  CircleHelp,
  CreditCard,
  FileText,
  Film,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Monitor,
  MoreHorizontal,
  Plane,
  Shield,
  ShoppingBag,
  ShoppingBasket,
  Tag,
  Undo2,
  Users,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react'

import { getCategoryMeta } from '@/features/expenses/lib/category-meta'
import { cn } from '@/lib/utils'

const ICON_BY_NAME: Record<string, LucideIcon> = {
  'question-circle': CircleHelp,
  utensils: Utensils,
  'shopping-basket': ShoppingBasket,
  'shopping-bag': ShoppingBag,
  car: Car,
  bolt: Zap,
  'file-text': FileText,
  briefcase: Briefcase,
  exchange: ArrowLeftRight,
  monitor: Monitor,
  landmark: Landmark,
  'credit-card': CreditCard,
  'graduation-cap': GraduationCap,
  calendar: FileText,
  film: Film,
  'heart-pulse': HeartPulse,
  activity: Activity,
  wallet: Wallet,
  banknote: Banknote,
  undo: Undo2,
  home: Home,
  shield: Shield,
  gift: Gift,
  users: Users,
  'more-horizontal': MoreHorizontal,
  plane: Plane,
  'chart-line': ChartLine,
}

export function resolveCategoryLucideIcon(
  categoryOrIcon: string,
): LucideIcon {
  const meta = getCategoryMeta(categoryOrIcon)
  const iconName = meta?.icon ?? categoryOrIcon
  return ICON_BY_NAME[iconName] ?? Tag
}

interface CategoryIconProps {
  category: string
  className?: string
  size?: number
  style?: CSSProperties
  showDot?: boolean
}

export function CategoryIcon({
  category,
  className,
  size = 14,
  style,
  showDot = false,
}: CategoryIconProps) {
  const meta = getCategoryMeta(category)
  const Icon = resolveCategoryLucideIcon(category)
  const color = meta?.color

  if (showDot) {
    return (
      <span
        className={cn('inline-block size-3 shrink-0 rounded-full', className)}
        style={{ backgroundColor: color ?? 'var(--color-muted-foreground)' }}
      />
    )
  }

  return (
    <Icon
      className={cn('shrink-0', className)}
      size={size}
      style={{ color: color ?? undefined, ...style }}
      aria-hidden
    />
  )
}

export function createCategoryChartIcon(category: string): LucideIcon {
  return resolveCategoryLucideIcon(category)
}
