// Resolves the same {{token}} vocabulary the AI copy generator writes and the
// storefront's client-side resolveTokens() (src/lib/resolveTokens.js) reads —
// used server-side (JSON-LD, meta tags) where there's no live shopper
// selection to react to, so tokens resolve against the product's DEFAULT
// variant (first metal option's first purity/color, etc).
export interface TokenContext {
  metal_type?: string | null
  karat?: string | null
  metal_color?: string | null
  diamond_shape?: string | null
  diamond_weight?: string | null
  diamond_clarity?: string | null
  diamond_color?: string | null
}

const FALLBACKS: Record<keyof TokenContext, string> = {
  metal_type: 'premium metal',
  karat: '',
  metal_color: '',
  diamond_shape: 'diamond',
  diamond_weight: '',
  diamond_clarity: '',
  diamond_color: '',
}

export function defaultTokenContext(product: any): TokenContext {
  const md = (product?.metadata as any) || {}
  const firstMetal = Array.isArray(md.metalOptions) ? md.metalOptions[0] : null
  const weightCt = product?.diamondWeightCt ?? product?.centerStoneWeightCt
  return {
    metal_type: firstMetal?.type || product?.metalType || null,
    karat: firstMetal?.purities?.[0] || product?.metalPurity || null,
    metal_color: firstMetal?.colors?.[0] || product?.metalColor || null,
    diamond_shape: product?.diamondShape || product?.centerStoneShape || null,
    diamond_weight: weightCt ? `${weightCt}ct` : null,
    diamond_clarity: product?.diamondClarity || product?.diamondQuality || null,
    diamond_color: product?.diamondColor || null,
  }
}

export function resolveTokens(text: string | null | undefined, ctx: TokenContext): string {
  if (!text) return ''
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: keyof TokenContext) => {
    const value = ctx[key]
    if (value) return value
    return key in FALLBACKS ? FALLBACKS[key] : match
  }).replace(/\s+/g, ' ').trim()
}
