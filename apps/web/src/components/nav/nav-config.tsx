import type { ComponentType } from 'react'

import {
  Banknote,
  Briefcase,
  Building2,
  ChartArea,
  FlaskConical,
  LayoutDashboard,
  LineChart,
  Mail,
  Paintbrush,
  Plane,
  Shield,
  TrendingUp,
} from 'lucide-react'

import { appPaths } from '@/config/app-paths'

export interface NavSubItem {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
  description?: string
  keywords?: string[]
}

export interface NavItem {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
  description: string
  category: 'workspace' | 'finance' | 'travel' | 'system'
  keywords: string[]
  children?: NavSubItem[]
}

export interface NavCategory {
  id: NavItem['category']
  label: string
  description: string
}

export const navCategories: NavCategory[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    description: 'Core workspace surfaces, customization, and experiments.',
  },
  {
    id: 'finance',
    label: 'Finance',
    description: 'Portfolio, analytics, patterns, dividends, and emails.',
  },
  {
    id: 'travel',
    label: 'Travel',
    description: 'Flights and hotels planning views.',
  },
  {
    id: 'system',
    label: 'System',
    description: 'Security, identity, and account settings.',
  },
]

export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: appPaths.auth.dashboard.getHref(),
    icon: LayoutDashboard,
    description: 'High-level workspace overview and assistant entry point.',
    category: 'workspace',
    keywords: ['home', 'overview', 'assistant'],
  },
  {
    label: 'Themes',
    href: appPaths.auth.themes.getHref(),
    icon: Paintbrush,
    description: 'Tune the visual system, presets, and app shell.',
    category: 'workspace',
    keywords: ['design', 'appearance', 'layout'],
  },
  {
    label: 'Playground',
    href: appPaths.auth.playground.getHref(),
    icon: FlaskConical,
    description: 'Try ideas, components, and experiments in isolation.',
    category: 'workspace',
    keywords: ['sandbox', 'lab', 'prototype'],
  },
  {
    label: 'Analytics',
    href: appPaths.auth.analytics.getHref(),
    icon: ChartArea,
    description: 'Inspect analytics, trends, and expense distributions.',
    category: 'finance',
    keywords: ['expenses', 'charts', 'insights'],
  },
  {
    label: 'Patterns',
    href: appPaths.auth.patterns.getHref(),
    icon: TrendingUp,
    description: 'Review recurring spending and pattern detection.',
    category: 'finance',
    keywords: ['habits', 'recurring', 'signals'],
  },
  {
    label: 'Holdings',
    href: appPaths.auth.holdings.getHref(),
    icon: Briefcase,
    description: 'Track holdings, allocation, and portfolio composition.',
    category: 'finance',
    keywords: ['portfolio', 'assets', 'positions'],
  },
  {
    label: 'Projections',
    href: appPaths.auth.projections.getHref(),
    icon: LineChart,
    description: 'Investment projection calculator with scenario analysis.',
    category: 'finance',
    keywords: ['calculator', 'sip', 'projections', 'wealth'],
  },
  {
    label: 'Dividends',
    href: appPaths.auth.dividends.getHref(),
    icon: Banknote,
    description: 'Monitor dividend income and payout history.',
    category: 'finance',
    keywords: ['income', 'yield', 'payouts'],
  },
  {
    label: 'Emails',
    href: appPaths.auth.expensesEmails.getHref(),
    icon: Mail,
    description: 'Browse parsed expense emails and drill into details.',
    category: 'finance',
    keywords: ['messages', 'receipts', 'expenses'],
  },
  {
    label: 'Flights and Hotels',
    href: appPaths.auth.flights.getHref(),
    icon: Plane,
    description: 'Coordinate travel details across flights and hotels.',
    category: 'travel',
    keywords: ['trips', 'bookings', 'hotels'],
    children: [
      {
        label: 'Flights',
        href: appPaths.auth.flights.getHref(),
        icon: Plane,
        description: 'View and manage flight itineraries.',
        keywords: ['air', 'itinerary'],
      },
      {
        label: 'Hotels',
        href: appPaths.auth.hotels.getHref(),
        icon: Building2,
        description: 'View hotel reservations and stays.',
        keywords: ['lodging', 'stays'],
      },
    ],
  },
  {
    label: 'Account',
    href: appPaths.auth.account.getHref(),
    icon: Shield,
    description: 'Manage passkeys, security, and account access.',
    category: 'system',
    keywords: ['settings', 'security', 'profile'],
  },
]

export function isItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function getActiveNavItem(pathname: string) {
  return (
    navItems.find(
      (item) =>
        item.children?.some((child) => isItemActive(pathname, child.href)) ||
        isItemActive(pathname, item.href),
    ) ?? navItems[0]
  )
}

export function getActiveNavChild(pathname: string, item: NavItem | undefined) {
  if (!item?.children) {
    return null
  }

  return (
    item.children.find((child) => isItemActive(pathname, child.href)) ??
    item.children[0] ??
    null
  )
}

export function getNavItemsForCategory(category: NavItem['category']) {
  return navItems.filter((item) => item.category === category)
}
