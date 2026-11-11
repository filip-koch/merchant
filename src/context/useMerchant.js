import { useContext } from 'react'
import { MerchantContext } from './MerchantContextObject.js'

export function useMerchant() {
  const context = useContext(MerchantContext)
  if (!context) {
    throw new Error('useMerchant must be used within a MerchantProvider')
  }
  return context
}
