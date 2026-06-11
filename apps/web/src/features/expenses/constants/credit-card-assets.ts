import dcbmImage from '@/assets/credit-cards/dcbm.png'
import regaliaGoldImage from '@/assets/credit-cards/regalia-gold.png'
import swiggyImage from '@/assets/credit-cards/swiggy.png'
import tataNeuImage from '@/assets/credit-cards/tata-neu.png'

export const CREDIT_CARD_IMAGES: Record<string, string> = {
  swiggy: swiggyImage,
  'regalia-gold': regaliaGoldImage,
  'tata-neu': tataNeuImage,
  dcbm: dcbmImage,
}

export function getCreditCardImage(imageKey?: string): string | undefined {
  if (!imageKey) return undefined
  return CREDIT_CARD_IMAGES[imageKey]
}
