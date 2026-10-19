import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { GenerateListingDto } from '../dto/generate-listing.dto'

const MODEL_IDS: Record<string, string> = {
  haiku: 'claude-haiku-4-5',
  sonnet: 'claude-sonnet-5',
}

// Kept in sync with the storefront's resolveTokens() vocabulary
// (elova_frontend .../src/lib/resolveTokens.js) — adding a token here without
// adding it there just leaves literal "{{...}}" text on the page.
const SUPPORTED_TOKENS = [
  '{{metal_type}}', '{{karat}}', '{{metal_color}}',
  '{{diamond_shape}}', '{{diamond_weight}}', '{{diamond_clarity}}', '{{diamond_color}}',
]

const FAQ_SCHEMA = {
  type: 'object',
  properties: {
    question: { type: 'string' },
    answer: { type: 'string' },
  },
  required: ['question', 'answer'],
  additionalProperties: false,
}

const LISTING_SCHEMA = {
  type: 'object',
  properties: {
    productName: { type: 'string' },
    shortDescription: { type: 'string' },
    description: { type: 'string' },
    seoTitle: { type: 'string' },
    seoDescription: { type: 'string' },
    keywords: { type: 'string' },
    aeoSummary: { type: 'string' },
    // NOTE: Claude's structured-output json_schema only supports minItems/
    // maxItems of 0 or 1 on arrays — the "3-5 items" requirement is enforced
    // via the prompt text instead (see FIELD SPECS below), not the schema.
    faqs: { type: 'array', items: FAQ_SCHEMA },
  },
  required: [
    'productName', 'shortDescription', 'description', 'seoTitle', 'seoDescription',
    'keywords', 'aeoSummary', 'faqs',
  ],
  additionalProperties: false,
}

const SYSTEM_PROMPT =
  'You are an expert luxury jewelry copywriter for Rangani Jewelry House, a fine jewelry brand. ' +
  'Write compelling, accurate, SEO-friendly product listing copy strictly from the attributes given ' +
  '— never invent facts (materials, carat weight, certification, price) that are not present in the input. ' +
  'Keep the tone premium and confident, not overwrought.\n\n' +
  'DYNAMIC TOKENS — this product page lets a shopper pick between multiple metal/diamond options, ' +
  'so the copy must stay accurate no matter what they select. The attribute list below marks each ' +
  'attribute as either "(single value)" or "(multiple options — use a token)". Rules:\n' +
  '- For any attribute marked "multiple options", write the matching token below INSTEAD OF naming ' +
  'one specific option. Never pick a favorite among the options or write a comma list of them.\n' +
  '- For any attribute marked "single value" (or not marked at all), write that value as normal literal text.\n' +
  `- Only use these exact tokens, verbatim, nothing invented: ${SUPPORTED_TOKENS.join(', ')}.\n` +
  '- Tokens read naturally in a sentence, e.g. "Crafted in {{karat}} {{metal_color}} gold featuring a ' +
  '{{diamond_shape}} lab-grown diamond." Use them in productName, shortDescription, description, seoTitle, ' +
  'seoDescription, aeoSummary, and FAQ answers wherever the relevant attribute is a token-eligible one.\n' +
  '- CRITICAL: "keywords" must NEVER contain a token or any "{{...}}" text — it is a plain literal comma ' +
  'list read directly by search engines. If an attribute is multi-option, either omit it from keywords or ' +
  'name ONE representative option there (fine for keywords only — nowhere else).\n\n' +
  'FIELD SPECS:\n' +
  'productName: a concise, sellable product title (under 70 characters).\n' +
  'shortDescription: one sentence, under 160 characters, for card/listing views.\n' +
  'description: 2-3 sentences of rich product-page copy.\n' +
  'seoTitle: under 60 characters, includes the most important attributes for search.\n' +
  'seoDescription: 150-160 characters, written for a Google search snippet.\n' +
  'keywords: 5-8 comma-separated search keywords/phrases a shopper would use (plain text, no tokens).\n' +
  'aeoSummary: a short (2-3 sentence), plain, factual, direct-answer style summary written for AI answer ' +
  'engines (ChatGPT, Perplexity, Google AI Overviews) to quote verbatim — state what the product IS ' +
  '(category, metal, stone, style) in plain declarative sentences, no marketing adjectives, no superlatives.\n' +
  'faqs: 3-5 short, genuinely useful question/answer pairs a shopper would ask (metal options, sizing, ' +
  'care, certification, returns/warranty if relevant) — answers must stay strictly within the given attributes ' +
  'and use tokens for any multi-option attribute exactly like the other fields.'

function metalOptionLines(dto: GenerateListingDto): string[] {
  const lines: string[] = []
  for (const opt of dto.metalOptions || []) {
    if (opt.type) {
      lines.push(`Metal type: ${opt.type} (single value)`)
    }
    if (opt.purities?.length) {
      lines.push(
        opt.purities.length > 1
          ? `Metal purity/karat options: ${opt.purities.join(', ')} (multiple options — use a token)`
          : `Metal purity/karat: ${opt.purities[0]} (single value)`,
      )
    }
    if (opt.colors?.length) {
      lines.push(
        opt.colors.length > 1
          ? `Metal color options: ${opt.colors.join(', ')} (multiple options — use a token)`
          : `Metal color: ${opt.colors[0]} (single value)`,
      )
    }
  }
  return lines
}

function buildAttributeLines(dto: GenerateListingDto): string[] {
  const lines: string[] = []
  const add = (label: string, value?: string | number) => {
    if (value !== undefined && value !== null && value !== '') lines.push(`${label}: ${value} (single value)`)
  }
  add('Product name (working title)', dto.productName)
  add('Category', dto.category)
  add('Sub-category / style', dto.subCategory)
  add('Collection', dto.collectionName)
  add('Occasion', dto.occasion)
  add('Gender', dto.gender)
  lines.push(...metalOptionLines(dto))
  add('Diamond shape', dto.diamondShape)
  add('Diamond quality', dto.diamondQuality)
  add('Diamond color', dto.diamondColor)
  add('Diamond clarity', dto.diamondClarity)
  add('Diamond cut', dto.diamondCut)
  add('Diamond count', dto.diamondCount)
  // Carat is shopper-selectable whenever the product's carat→weight matrix
  // offers more than one option (the storefront's "Center Diamond Weight"
  // chips) — same variable-vs-fixed rule as metal purity/color above.
  const uniqueWeights = [...new Set((dto.diamondWeightOptions || []).filter((w) => w > 0))]
  if (uniqueWeights.length > 1) {
    lines.push(`Diamond total weight (ct) options: ${uniqueWeights.join(', ')} (multiple options — use a token)`)
  } else {
    add('Diamond total weight (ct)', dto.diamondWeightCt)
  }
  add('Center stone shape', dto.centerStoneShape)
  if (uniqueWeights.length <= 1) {
    add('Center stone weight (ct)', dto.centerStoneWeightCt)
  }
  add('Style', dto.style)
  add('Brand', dto.brand)
  return lines
}

@Injectable()
export class AiCopyService {
  constructor(private readonly configService: ConfigService) {}

  async generateListing(dto: GenerateListingDto) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY')
    if (!apiKey) {
      throw new InternalServerErrorException('ANTHROPIC_API_KEY is not configured on the server')
    }

    const modelId = MODEL_IDS[dto.model || 'haiku']
    const attributeLines = buildAttributeLines(dto)
    if (!attributeLines.length) {
      throw new BadRequestException('No product attributes provided to generate listing copy from')
    }

    const userPrompt = `Product attributes:\n${attributeLines.join('\n')}\n\nGenerate the listing fields.`

    try {
      const { data } = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: modelId,
          max_tokens: 1536,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
          output_config: { format: { type: 'json_schema', schema: LISTING_SCHEMA } },
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 45000,
        },
      )

      const textBlock = (data.content || []).find((b: any) => b.type === 'text')
      if (!textBlock) {
        throw new InternalServerErrorException('AI response contained no text output')
      }
      return JSON.parse(textBlock.text)
    } catch (err: any) {
      if (err.response) {
        throw new InternalServerErrorException(
          err.response.data?.error?.message || `Anthropic API error (${err.response.status})`,
        )
      }
      throw new InternalServerErrorException(err.message || 'Failed to generate AI listing copy')
    }
  }
}
