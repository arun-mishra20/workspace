import {
  addYears,
  format,
  isBefore,
  startOfDay,
  subDays,
  subYears,
} from 'date-fns'

export type MilestoneDateRange = {
  start: Date
  end: Date
  label: string
}

const fmtDate = (date: Date) => format(date, 'd MMM yyyy')

/**
 * Compute the date range for a milestone based on its duration type.
 * - quarterly: current calendar quarter
 * - yearly with explicit dates: fixed window (legacy override)
 * - yearly with membershipStart (MM-DD): rolling membership year
 * - yearly default: current calendar year
 */
export function computeMilestoneDateRange(
  duration: string,
  options: {
    startDate?: string
    endDate?: string
    membershipStart?: string
    now?: Date
  } = {},
): MilestoneDateRange {
  const now = options.now ?? new Date()

  if (duration === 'quarterly') {
    const quarter = Math.floor(now.getMonth() / 3)
    const quarterNames = ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec']
    const start = new Date(now.getFullYear(), quarter * 3, 1)
    const end = new Date(now.getFullYear(), quarter * 3 + 3, 1)
    return {
      start,
      end,
      label: `Q${quarter + 1} ${now.getFullYear()} (${quarterNames[quarter]})`,
    }
  }

  if (options.startDate && options.endDate) {
    const start = startOfDay(new Date(options.startDate))
    const end = new Date(options.endDate)
    end.setHours(23, 59, 59, 999)
    return {
      start,
      end,
      label: `${fmtDate(start)} – ${fmtDate(end)}`,
    }
  }

  if (options.membershipStart) {
    return computeMembershipYearRange(options.membershipStart, now)
  }

  const start = new Date(now.getFullYear(), 0, 1)
  const end = new Date(now.getFullYear() + 1, 0, 1)
  return { start, end, label: `FY ${now.getFullYear()}` }
}

function computeMembershipYearRange(
  membershipStart: string,
  now: Date,
): MilestoneDateRange {
  const [monthStr, dayStr] = membershipStart.split('-')
  const month = Number(monthStr) - 1
  const day = Number(dayStr)

  let start = startOfDay(new Date(now.getFullYear(), month, day))
  if (isBefore(now, start)) {
    start = startOfDay(subYears(start, 1))
  }

  const end = startOfDay(addYears(start, 1))
  const endInclusive = subDays(end, 1)

  return {
    start,
    end,
    label: `Membership year: ${fmtDate(start)} – ${fmtDate(endInclusive)}`,
  }
}
