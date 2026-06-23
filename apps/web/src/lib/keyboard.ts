import type { KeyboardEvent } from 'react'

export function activateOnKeyboardClick(
  event: KeyboardEvent,
  action: () => void,
) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    action()
  }
}
