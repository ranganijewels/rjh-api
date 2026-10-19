import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Product } from '../../database/entities/product.entity'
import { CatalogMaster } from '../../database/entities/catalog-master.entity'

export interface SearchParams {
  q?: string
  category?: string
  metalType?: string
  metalColor?: string
  shape?: string
  status?: string
  minWeight?: number | string
  maxWeight?: number | string
  page?: number | string
  limit?: number | string
  sort?: string
}

interface FacetBucket {
  value: string
  count: number
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(CatalogMaster)
    private readonly catalogRepo: Repository<CatalogMaster>,
  ) {}

  /**
   * Postgres-backed product search read-model. Filters jeos_products with a
   * QueryBuilder: soft-delete aware, status-scoped, ILIKE free-text, equality
   * facet filters and a gross-weight range. Returns a paginated envelope.
   */
  async search(tenantId: string, params: SearchParams = {}) {
    const page = Math.max(1, this.toInt(params.page, 1))
    const limit = Math.min(100, Math.max(1, this.toInt(params.limit, 20)))
    const status = (params.status && String(params.status).trim()) || 'active'

    const qb = this.productRepo
      .createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.isDeleted = false')
      .andWhere('p.status = :status', { status })

    if (params.q && String(params.q).trim()) {
      const q = `%${String(params.q).trim()}%`
      qb.andWhere(
        '(p.productName ILIKE :q OR p.productCode ILIKE :q OR p.description ILIKE :q)',
        { q },
      )
    }

    if (params.category) {
      qb.andWhere('p.category = :category', { category: params.category })
    }
    if (params.metalType) {
      qb.andWhere('p.metalType = :metalType', { metalType: params.metalType })
    }
    if (params.metalColor) {
      qb.andWhere('p.metalColor = :metalColor', { metalColor: params.metalColor })
    }
    if (params.shape) {
      // Resolve synonyms so 'Oval Cut' → 'Oval' before equality match.
      const shape = await this.resolveSynonym(tenantId, 'diamond_shape', String(params.shape))
      qb.andWhere('p.diamondShape = :shape', { shape })
    }

    const minWeight = this.toNum(params.minWeight)
    const maxWeight = this.toNum(params.maxWeight)
    if (minWeight !== undefined) {
      qb.andWhere('p.grossWeightG >= :minWeight', { minWeight })
    }
    if (maxWeight !== undefined) {
      qb.andWhere('p.grossWeightG <= :maxWeight', { maxWeight })
    }

    const { field, dir } = this.parseSort(params.sort)
    qb.orderBy(`p.${field}`, dir)

    qb.skip((page - 1) * limit).take(limit)

    const [data, total] = await qb.getManyAndCount()

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    }
  }

  /**
   * Available facet values with counts, grouped via raw GROUP BY queries over
   * the live (non-deleted, active) product set.
   */
  async facets(tenantId: string) {
    const [category, metal, color, shape] = await Promise.all([
      this.facetBuckets(tenantId, 'category'),
      this.facetBuckets(tenantId, 'metal_type'),
      this.facetBuckets(tenantId, 'metal_color'),
      this.facetBuckets(tenantId, 'diamond_shape'),
    ])
    return { category, metal, color, shape }
  }

  /**
   * Typeahead: top product-name matches plus matching catalog master names /
   * synonyms (synonyms jsonb searched with ILIKE on its text form).
   */
  async autocomplete(tenantId: string, q?: string) {
    const term = (q || '').trim()
    if (!term) return []

    const like = `%${term}%`

    const products = await this.productRepo
      .createQueryBuilder('p')
      .select('p.productName', 'productName')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.isDeleted = false')
      .andWhere('p.status = :status', { status: 'active' })
      .andWhere('p.productName ILIKE :like', { like })
      .orderBy('p.productName', 'ASC')
      .limit(8)
      .getRawMany<{ productName: string }>()

    const masters = await this.catalogRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.status = :status', { status: 'active' })
      .andWhere(
        '(c.name ILIKE :like OR CAST(c.synonyms AS text) ILIKE :like)',
        { like },
      )
      .orderBy('c.name', 'ASC')
      .limit(8)
      .getMany()

    const out: { type: string; label: string; value: string }[] = []

    for (const p of products) {
      if (p.productName) {
        out.push({ type: 'product', label: p.productName, value: p.productName })
      }
    }
    for (const m of masters) {
      out.push({ type: m.kind || 'catalog', label: m.name, value: m.code || m.name })
    }

    return out
  }

  /**
   * Resolve a user-facing synonym to its canonical master name.
   * e.g. ('diamond_shape', 'Oval Cut') → 'Oval'. Falls back to the input
   * (trimmed) when no master/synonym matches.
   */
  async resolveSynonym(tenantId: string, kind: string, input: string): Promise<string> {
    const value = (input || '').trim()
    if (!value) return value

    const masters = await this.catalogRepo.find({
      where: { tenantId, kind, status: 'active' },
    })

    const lower = value.toLowerCase()
    for (const m of masters) {
      if (m.name && m.name.toLowerCase() === lower) return m.name
      if (m.code && m.code.toLowerCase() === lower) return m.name
      const synonyms = Array.isArray(m.synonyms) ? m.synonyms : []
      if (synonyms.some((s) => typeof s === 'string' && s.toLowerCase() === lower)) {
        return m.name
      }
    }

    return value
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  private async facetBuckets(tenantId: string, column: string): Promise<FacetBucket[]> {
    const rows = await this.productRepo
      .createQueryBuilder('p')
      .select(`p.${column}`, 'value')
      .addSelect('COUNT(*)', 'count')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.isDeleted = false')
      .andWhere('p.status = :status', { status: 'active' })
      .andWhere(`p.${column} IS NOT NULL`)
      .andWhere(`p.${column} <> ''`)
      .groupBy(`p.${column}`)
      .orderBy('count', 'DESC')
      .getRawMany<{ value: string; count: string }>()

    return rows.map((r) => ({ value: r.value, count: Number(r.count) || 0 }))
  }

  private parseSort(sort?: string): { field: string; dir: 'ASC' | 'DESC' } {
    const allowed: Record<string, string> = {
      newest: 'createdAt',
      oldest: 'createdAt',
      name: 'productName',
      weight: 'grossWeightG',
      productName: 'productName',
      grossWeightG: 'grossWeightG',
      createdAt: 'createdAt',
    }
    const raw = (sort || '').trim()
    if (!raw) return { field: 'createdAt', dir: 'DESC' }

    const [keyPart, dirPart] = raw.split(':')
    const key = keyPart.trim()
    const field = allowed[key] || 'createdAt'

    let dir: 'ASC' | 'DESC'
    if (dirPart) {
      dir = dirPart.trim().toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    } else if (key === 'oldest' || key === 'name') {
      dir = 'ASC'
    } else {
      dir = 'DESC'
    }
    return { field, dir }
  }

  private toInt(v: unknown, fallback: number): number {
    const n = parseInt(String(v ?? ''), 10)
    return Number.isFinite(n) ? n : fallback
  }

  private toNum(v: unknown): number | undefined {
    if (v === undefined || v === null || String(v).trim() === '') return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
}
