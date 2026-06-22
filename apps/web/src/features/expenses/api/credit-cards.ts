import { CreditCardProfileSchema } from '@workspace/domain'
import { z } from 'zod'

import { apiRequest } from '@/lib/api-client'

const creditCardsSchema = z.array(CreditCardProfileSchema)

export async function fetchCreditCards() {
  const json = await apiRequest({
    method: 'GET',
    url: '/api/expenses/cards',
    headers: {
      Accept: 'application/json',
    },
  })
  return creditCardsSchema.parse(json)
}
