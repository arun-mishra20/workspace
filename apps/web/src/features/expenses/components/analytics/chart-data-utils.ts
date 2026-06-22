export function topNWithOther<T extends { amount: number }>(
  items: T[],
  n: number,
  createOther: (rest: T[]) => T,
): T[] {
  if (items.length <= n) {
    return items
  }

  const sorted = [...items].sort((a, b) => b.amount - a.amount)
  const top = sorted.slice(0, n)
  const rest = sorted.slice(n)

  return [...top, createOther(rest)]
}
