/**
 * Minimal dependency-free HTML sanitizer for CMS page content.
 *
 * CMS pages are rendered on the storefront via dangerouslySetInnerHTML, so any
 * script/handler that slips through would execute in the shopper's browser.
 * This strips dangerous constructs while keeping the formatting tags editors
 * actually use. It is intentionally conservative (allowlist-based).
 *
 * NOTE: for a hardened production setup, swap this for `sanitize-html` or a
 * DOMPurify server build. This covers the common XSS vectors dependency-free.
 */

const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr', 'blockquote', 'pre', 'code',
  'strong', 'b', 'em', 'i', 'u', 's', 'span', 'small', 'mark',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'section', 'article',
])

// Attributes allowed per tag (everything else is dropped).
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading']),
  '*': new Set(['class']),
}

// URL schemes we permit on href/src. Anything with a scheme not on this list
// (javascript:, data:, vbscript:, …) — or that resolves to one after decoding
// — is dropped. Schemeless URLs (/path, #anchor, page.html) are always fine.
const SAFE_URL_SCHEMES = new Set(['http', 'https', 'mailto', 'tel'])

const NAMED_ENTITIES: Record<string, string> = {
  lt: '<', gt: '>', quot: '"', amp: '&', apos: "'",
  colon: ':', tab: '\t', newline: '\n',
}

// Decode HTML entities that matter for URL-scheme detection so an encoded
// scheme like "&#106;avascript:" can't slip past the allowlist.
function decodeEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => {
      const code = parseInt(hex, 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : ''
    })
    .replace(/&#(\d+);?/g, (_, dec) => {
      const code = parseInt(dec, 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : ''
    })
    .replace(/&([a-z]+);/gi, (whole, name) => NAMED_ENTITIES[name.toLowerCase()] ?? whole)
}

// True if the (decoded) URL is safe to render: no scheme, or an allowlisted one.

function isSafeUrl(rawValue: string): boolean {
  // Decode entities, then strip whitespace + control chars — browsers ignore
  // tab/newline/NUL inside a URL scheme when parsing, so a control-char scheme runs.
  const cleaned = decodeEntities(rawValue)
    .replace(/[\u0000-\u0020\u007f-\u00a0]/g, '')
    .toLowerCase()
  const schemeMatch = cleaned.match(/^([a-z][a-z0-9+.-]*):/)
  if (!schemeMatch) return true // relative URL / anchor — safe
  return SAFE_URL_SCHEMES.has(schemeMatch[1])
}

export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return ''

  let html = input

  // 1. Remove whole dangerous elements (with their content).
  html = html.replace(
    /<\s*(script|style|iframe|object|embed|form|input|button|link|meta|base|noscript|svg|math)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,
    '',
  )
  // Self-closing / unclosed variants of the same.
  html = html.replace(
    /<\s*(script|style|iframe|object|embed|form|input|button|link|meta|base|noscript|svg|math)\b[^>]*\/?>/gi,
    '',
  )

  // 2. Strip HTML comments (can hide conditional-comment scripts).
  html = html.replace(/<!--[\s\S]*?-->/g, '')

  // 3. Walk every remaining tag; drop disallowed tags and unsafe attributes.
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, rawTag, rawAttrs) => {
    const tag = String(rawTag).toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) return '' // drop tag, keep inner text

    const isClosing = /^<\//.test(match)
    if (isClosing) return `</${tag}>`

    const selfClose = /\/\s*>$/.test(match)
    const allowed = ALLOWED_ATTRS[tag] || new Set<string>()
    const global = ALLOWED_ATTRS['*']

    const cleanAttrs: string[] = []
    const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g
    let m: RegExpExecArray | null
    while ((m = attrRe.exec(rawAttrs)) !== null) {
      const name = m[1].toLowerCase()
      let value = m[3] ?? m[4] ?? m[5] ?? ''

      // Never allow event handlers or style (style enables expression()/url() abuse).
      if (name.startsWith('on') || name === 'style') continue
      if (!allowed.has(name) && !global.has(name)) continue

      // Enforce a safe URL scheme on href/src (decodes + strips control chars).
      if ((name === 'href' || name === 'src') && !isSafeUrl(value)) continue

      // Escape output. `&` is escaped only when NOT already a valid entity, so
      // an encoded scheme can't survive as a live entity in the rendered HTML.
      value = value
        .replace(/&(?!(#\d+|#x[0-9a-f]+|[a-z]+);)/gi, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      cleanAttrs.push(`${name}="${value}"`)
    }

    // Force safe rel on links that open a new tab.
    if (tag === 'a') {
      const hasTargetBlank = /target\s*=\s*("|')?_blank/i.test(rawAttrs)
      if (hasTargetBlank && !cleanAttrs.some((a) => a.startsWith('rel='))) {
        cleanAttrs.push('rel="noopener noreferrer"')
      }
    }

    const attrStr = cleanAttrs.length ? ' ' + cleanAttrs.join(' ') : ''
    return `<${tag}${attrStr}${selfClose ? ' /' : ''}>`
  })

  return html
}
