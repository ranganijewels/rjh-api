import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DamAsset } from '../../database/entities/dam-asset.entity'
import { ProductAssetBinding } from '../../database/entities/product-asset-binding.entity'

// Color token → canonical name map (extend freely).
const COLOR_MAP: Record<string, string> = {
  WG: 'White',
  YG: 'Yellow',
  RG: 'Rose',
}

// Recognized view tokens — pass through unchanged.
const VIEW_TOKENS = ['FR', 'SP', 'TP', 'LG', 'HD']

export interface ParsedTokens {
  family: string
  shape: string
  color: string
  view: string
  seq: string
  raw: string[]
}

@Injectable()
export class DamService {
  constructor(
    @InjectRepository(DamAsset)
    private readonly assets: Repository<DamAsset>,
    @InjectRepository(ProductAssetBinding)
    private readonly bindings: Repository<ProductAssetBinding>,
  ) {}

  // ─── Naming convention parser ─────────────────────────────────────────────
  // 'LR-001-RND-WG-FR-01.jpg' → { family:'LR-001', shape:'RND', color:'WG', view:'FR', seq:'01' }
  parseFileName(name: string): ParsedTokens {
    const base = String(name || '').trim()
    // Strip extension (last dot segment) if present.
    const dot = base.lastIndexOf('.')
    const noExt = dot > 0 ? base.slice(0, dot) : base
    const parts = noExt.split('-').map((p) => p.trim()).filter((p) => p.length > 0)

    // family is the first two tokens (e.g. 'LR' + '001' → 'LR-001'); tolerate fewer.
    const family = parts.slice(0, 2).join('-')
    const shape = parts[2] || ''
    const color = parts[3] || ''
    const view = parts[4] || ''
    const seq = parts[5] || ''

    return { family, shape, color, view, seq, raw: parts }
  }

  mapColor(token?: string): string | null {
    if (!token) return null
    return COLOR_MAP[token.toUpperCase()] || null
  }

  mapView(token?: string): string | null {
    if (!token) return null
    const t = token.toUpperCase()
    return VIEW_TOKENS.includes(t) ? t : t
  }

  // ─── Ingest ───────────────────────────────────────────────────────────────
  async ingest(
    tenantId: string,
    items: Array<{ fileName: string; url?: string }>,
    createdBy?: string,
  ): Promise<{ created: DamAsset[]; bindings: ProductAssetBinding[]; unmatched: any[] }> {
    const created: DamAsset[] = []
    const createdBindings: ProductAssetBinding[] = []
    const unmatched: any[] = []

    for (const item of items || []) {
      if (!item || !item.fileName) {
        unmatched.push(item)
        continue
      }

      const parsed = this.parseFileName(item.fileName)

      const asset = await this.assets.save(
        this.assets.create({
          tenantId,
          type: 'image',
          fileName: item.fileName,
          url: item.url || null,
          parsedTokens: parsed as unknown as Record<string, any>,
          createdBy: createdBy || null,
        }),
      )
      created.push(asset)

      const metalColor = this.mapColor(parsed.color)
      const viewCode = this.mapView(parsed.view)
      const isPrimary = parsed.view === 'FR' && parsed.seq === '01'

      const binding = await this.bindings.save(
        this.bindings.create({
          tenantId,
          assetId: asset.id,
          bindLevel: 'master',
          refId: parsed.family || '',
          metalColor: metalColor,
          viewCode: viewCode,
          sortOrder: 0,
          isPrimary,
          createdBy: createdBy || null,
        }),
      )
      createdBindings.push(binding)
    }

    return { created, bindings: createdBindings, unmatched }
  }

  // ─── Assets CRUD ──────────────────────────────────────────────────────────
  listAssets(tenantId: string, q: any = {}) {
    const where: any = { tenantId }
    if (q.type) where.type = q.type
    if (q.status) where.status = q.status
    return this.assets.find({ where, order: { createdAt: 'DESC' }, take: 500 })
  }

  async getAsset(tenantId: string, id: string) {
    const asset = await this.assets.findOne({ where: { id, tenantId } })
    if (!asset) throw new NotFoundException('DAM asset not found')
    return asset
  }

  createAsset(tenantId: string, body: any, createdBy?: string) {
    const asset = this.assets.create({ ...body, tenantId, createdBy: createdBy || null })
    return this.assets.save(asset)
  }

  async updateAsset(tenantId: string, id: string, body: any) {
    const asset = await this.getAsset(tenantId, id)
    Object.assign(asset, body)
    return this.assets.save(asset)
  }

  async removeAsset(tenantId: string, id: string) {
    const asset = await this.getAsset(tenantId, id)
    await this.assets.remove(asset)
    return { deleted: true, id }
  }

  // ─── Bindings ─────────────────────────────────────────────────────────────
  listBindings(tenantId: string, q: any = {}) {
    const where: any = { tenantId }
    const ref = q.refId || q.productId
    if (ref) where.refId = ref
    if (q.bindLevel) where.bindLevel = q.bindLevel
    return this.bindings.find({
      where,
      order: { isPrimary: 'DESC', sortOrder: 'ASC', createdAt: 'ASC' },
      take: 500,
    })
  }

  // ─── Reports ──────────────────────────────────────────────────────────────
  async missingReport(_tenantId: string): Promise<any[]> {
    return []
  }
}
