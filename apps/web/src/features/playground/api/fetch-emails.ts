import { z } from 'zod'

import { apiRequest } from '@/lib/api-client'
import { RawEmailSchema } from '@workspace/domain'

const fetchPlaygroundEmailsResponseSchema = z.object({
  object: z.literal('list'),
  data: z.array(RawEmailSchema),
  page: z.number(),
  page_size: z.number(),
  total: z.number(),
  has_more: z.boolean(),
})

export type FetchPlaygroundEmailsResponse = z.infer<
  typeof fetchPlaygroundEmailsResponseSchema
>

export interface FetchPlaygroundEmailsInput {
  query: string
  limit: number
}

export async function fetchPlaygroundEmails(
  input: FetchPlaygroundEmailsInput,
): Promise<FetchPlaygroundEmailsResponse> {
  const json = await apiRequest({
    method: 'POST',
    url: '/api/playground/fetch',
    headers: {
      Accept: 'application/json',
    },
    data: input,
  })

  return fetchPlaygroundEmailsResponseSchema.parse(json)
}
