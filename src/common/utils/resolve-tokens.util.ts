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

const isBlank = (v: unknown) => v == null || v === '' || v === 'undefined' || v === 'null' || v === 'NaN'
const titleCase = (v: string) => v.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase())

/**
 * Token values from a cart line's metadata — the variant the shopper actually
 * chose (metalType "14KT", metalColor "WHITE", shape, centerDiamondWeight …).
 */
export function tokenContextFromCartMetadata(meta: Record<string, any> = {}): TokenContext {
  const purity = isBlank(meta.metalType) ? '' : String(meta.metalType).replace(/KT\b/i, 'K').toUpperCase()
  const karat = purity.match(/\d+K/i)?.[0] || purity
  const metalType = !isBlank(meta.metalTypeName)
    ? String(meta.metalTypeName)
    : /SILVER|925/i.test(purity)
      ? 'Silver'
      : /PLATINUM|PT/i.test(purity)
        ? 'Platinum'
        : /\d+K/i.test(purity)
          ? 'Gold'
          : ''
  const weight = isBlank(meta.centerDiamondWeight) ? '' : String(meta.centerDiamondWeight).replace(/[^\d.]/g, '')
  return {
    metal_type: metalType || null,
    karat: karat || null,
    metal_color: isBlank(meta.metalColor) ? null : titleCase(String(meta.metalColor)),
    diamond_shape: isBlank(meta.shape) ? null : titleCase(String(meta.shape)),
    diamond_weight: weight ? `${weight} ct` : null,
    diamond_clarity: isBlank(meta.clarity) ? null : String(meta.clarity),
    diamond_color: isBlank(meta.color) ? null : String(meta.color),
  }
}

/**
 * A cart line's display name with its tokens filled in from the chosen
 * variant: "{{karat}} {{metal_color}} Gold Pendant" → "14K White Gold Pendant".
 * Unknown tokens are dropped rather than shown as braces.
 */
export function resolveCartItemName(name: string | null | undefined, meta: Record<string, any> = {}): string {
  if (!name || !name.includes('{{')) return name || ''
  return resolveTokens(name, tokenContextFromCartMetadata(meta))
    .replace(/\{\{\s*\w+\s*\}\}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
