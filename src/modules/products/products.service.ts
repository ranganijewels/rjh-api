import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, SelectQueryBuilder } from 'typeorm'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import { Product } from '../../database/entities/product.entity'
import { ProductMedia } from '../../database/entities/product-media.entity'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { ProductFilterDto } from './dto/product-filter.dto'
import { paginate, getSkip } from '../../common/dto/pagination.dto'

const ENGAGEMENT_STYLES = ['solitaire', 'halo', 'hidden halo', 'side stone', 'three stone', 'two stone', 'toi et moi', 'bezel', 'vintage', 'pave', 'bridal']
const ENGAGEMENT_SQL = `(LOWER(p.category) LIKE 'ring%' AND (
  LOWER(COALESCE(p.collectionName,'')) LIKE '%engagement%'
  OR LOWER(p.productName) LIKE '%engagement%'
  OR LOWER(COALESCE(p.subCategory,'')) SIMILAR TO '%(${ENGAGEMENT_STYLES.join('|')})%'))`
const WEDDING_SQL = `(LOWER(p.category) LIKE 'wedding%'
  OR (LOWER(p.category) LIKE 'ring%' AND (
    LOWER(COALESCE(p.subCategory,'')) SIMILAR TO '%(eternity|wedding|band)%'
    OR LOWER(COALESCE(p.collectionName,'')) LIKE '%wedding%'
    OR LOWER(p.productName) SIMILAR TO '%(wedding|eternity|band)%')))`

// Storefront catalogue filters shared by the product list and the menu
// link-count check, so a menu link and the page it opens always agree.
export function applyCatalogFilters(qb: SelectQueryBuilder<Product>, dto: Partial<ProductFilterDto>) {
  const dept = String(dto.department || '').toLowerCase().trim()
  if (dept === 'engagement') qb.andWhere(ENGAGEMENT_SQL)
  else if (dept === 'wedding') qb.andWhere(WEDDING_SQL)
  else if (dept === 'jewellery' || dept === 'jewelry') qb.andWhere(`NOT ${ENGAGEMENT_SQL} AND NOT ${WEDDING_SQL}`)

  if (dto.collection) {
    qb.andWhere(
      `(LOWER(TRIM(COALESCE(p.collectionName,''))) = LOWER(TRIM(:collection))
        OR EXISTS (SELECT 1 FROM jeos_collections c WHERE c.tenant_id = p.tenant_id AND c.status = 'active'
          AND (LOWER(c.name) = LOWER(TRIM(:collection)) OR c.slug = LOWER(TRIM(:collection)))
          AND c.product_ids ? p.id::text))`,
      { collection: dto.collection },
    )
  }
  // Category matches the start of the category or of a word in it:
  // "ring" → Rings (not Earrings), "necklace" → Necklaces, "bands" → Wedding Bands.
  if (dto.category) {
    const c = String(dto.category).trim().replace(/[%_]/g, '')
    qb.andWhere('(p.category ILIKE :catStart OR p.category ILIKE :catWord)', { catStart: `${c}%`, catWord: `% ${c}%` })
  }
  if (dto.subCategory) qb.andWhere('p.subCategory ILIKE :subCategory', { subCategory: `%${String(dto.subCategory).trim()}%` })
  if (dto.metalType) qb.andWhere('p.metalType ILIKE :metalType', { metalType: `%${String(dto.metalType).trim()}%` })
  if (dto.metalColor) {
    // Match the default colour or any colour offered in metadata.metalOptions;
    // "Two Tone" means a combined colour such as "White/Yellow".
    const opts = "CASE WHEN jsonb_typeof(p.metadata->'metalOptions') = 'array' THEN p.metadata->'metalOptions' ELSE '[]'::jsonb END"
    const twoTone = /two[\s-]*tone/i.test(dto.metalColor)
    qb.andWhere(
      twoTone
        ? `(p.metalColor ILIKE '%/%' OR p.metalColor ILIKE '%two%' OR EXISTS (SELECT 1 FROM jsonb_array_elements(${opts}) m, jsonb_array_elements_text(CASE WHEN jsonb_typeof(m->'colors') = 'array' THEN m->'colors' ELSE '[]'::jsonb END) col WHERE col LIKE '%/%'))`
        : `(p.metalColor ILIKE :metalColor OR EXISTS (SELECT 1 FROM jsonb_array_elements(${opts}) m, jsonb_array_elements_text(CASE WHEN jsonb_typeof(m->'colors') = 'array' THEN m->'colors' ELSE '[]'::jsonb END) col WHERE col ILIKE :metalColor AND col NOT LIKE '%/%'))`,
      { metalColor: `%${String(dto.metalColor).trim()}%` },
    )
  }
  if (dto.diamondShape) {
    qb.andWhere('(p.diamondShape ILIKE :diamondShape OR p.centerStoneShape ILIKE :diamondShape)', {
      diamondShape: `%${String(dto.diamondShape).trim()}%`,
    })
  }
}

const DEPARTMENTS = new Set(['engagement', 'wedding', 'jewellery', 'jewelry'])

// Storefront /product URL params → catalogue filter. Mirrors
// rj-house-storefront/src/lib/listingParams.js.
export function listingParamsToFilter(q: URLSearchParams): Partial<ProductFilterDto> {
  const dto: Partial<ProductFilterDto> = {}
  const collection = q.get('collection')
  if (collection) {
    if (DEPARTMENTS.has(collection.toLowerCase())) dto.department = collection
    else dto.collection = collection
  }
  const category = q.get('category_id') || q.get('category')
  if (category) dto.category = category
  if (q.get('subcat')) dto.subCategory = q.get('subcat') as string
  if (q.get('shape')) dto.diamondShape = q.get('shape') as string
  if (q.get('metal')) dto.metalColor = q.get('metal') as string
  if (q.get('search')) dto.search = q.get('search') as string
  return dto
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name)
  private readonly ES_INDEX = 'products'

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(ProductMedia)
    private readonly mediaRepo: Repository<ProductMedia>,

    @Optional()
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async findAll(tenantId: string, dto: ProductFilterDto) {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.media', 'media')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.isDeleted = false')

    // Variant filtering: if parentProductId is specified, show those variants.
    // Otherwise show only top-level (non-variant) products.
    if (dto.parentProductId) {
      qb.andWhere('p.parentProductId = :parentProductId', { parentProductId: dto.parentProductId })
    } else {
      qb.andWhere('(p.parentProductId IS NULL OR p.parentProductId = \'\')')
    }

    if (dto.variantType) qb.andWhere('p.variantType = :variantType', { variantType: dto.variantType })
    if (dto.variantValue) qb.andWhere('p.variantValue ILIKE :variantValue', { variantValue: `%${dto.variantValue}%` })

    if (dto.search) {
      qb.andWhere(
        '(p.productName ILIKE :search OR p.productCode ILIKE :search)',
        { search: `%${dto.search}%` },
      )
    }
    applyCatalogFilters(qb, dto)
    if (dto.status) {
      // 'active' is the storefront canonical value; also match ERP statuses 'Published' and 'Approved'
      const statuses = dto.status.toLowerCase() === 'active'
        ? ['active', 'Published', 'Approved']
        : [dto.status]
      qb.andWhere('p.status IN (:...statuses)', { statuses })

      // A product with zero photos isn't public-ready no matter what its
      // status says — filtering by "active" is exactly how the storefront
      // (and an admin's own Status: Active filter) ask for public-ready
      // products, so require at least one media row too. The admin's
      // default, unfiltered list is untouched, so a media-less product is
      // always still findable there to fix.
      if (dto.status.toLowerCase() === 'active') {
        qb.andWhere(
          'EXISTS (SELECT 1 FROM jeos_product_media pm WHERE pm.product_id = p.id)',
        )
      }
    }
    // Price is computed by the Pricing Engine from master data (never stored),
    // so price-range filtering is intentionally not a DB column filter here.

    const sortField = dto.sortBy || 'createdAt'
    const sortDir = (dto.sortDir?.toUpperCase() as 'ASC' | 'DESC') || 'DESC'
    qb.orderBy(`p.${sortField}`, sortDir)

    qb.skip(getSkip(dto)).take(dto.limit)

    const [data, total] = await qb.getManyAndCount()
    return paginate(data, total, dto)
  }

  // Number of shopper-visible products behind each storefront listing link
  // (e.g. "/product?shape=Oval&collection=Engagement"), using exactly the
  // query-param mapping of the storefront /product page. Lets menus hide
  // links that would open an empty listing.
  async countListingLinks(tenantId: string, links: string[]) {
    const out: Record<string, number> = {}
    for (const link of links) {
      if (typeof link !== 'string' || !link.startsWith('/product')) continue
      const q = new URLSearchParams(link.split('?')[1] || '')
      const dto: Partial<ProductFilterDto> = listingParamsToFilter(q)
      const qb = this.productRepo
        .createQueryBuilder('p')
        .where('p.tenantId = :tenantId', { tenantId })
        .andWhere('p.isDeleted = false')
        .andWhere("(p.parentProductId IS NULL OR p.parentProductId = '')")
        .andWhere("p.status IN ('active','Published','Approved')")
        .andWhere('EXISTS (SELECT 1 FROM jeos_product_media pm WHERE pm.product_id = p.id)')
      if (dto.search) {
        qb.andWhere('(p.productName ILIKE :search OR p.productCode ILIKE :search)', { search: `%${dto.search}%` })
      }
      applyCatalogFilters(qb, dto)
      out[link] = await qb.getCount()
    }
    return out
  }

  async findVariants(tenantId: string, parentProductId: string): Promise<Product[]> {
    return this.productRepo.find({
      where: { tenantId, parentProductId, isDeleted: false },
      relations: ['media'],
      order: { variantValue: 'ASC' },
    })
  }

  // List every design group with its member products (admin management + the
  // form's group picker). A "design group" = products sharing metadata.designGroup.
  async findDesignGroups(tenantId: string): Promise<
    Array<{ group: string; count: number; shapes: string[]; products: any[] }>
  > {
    const rows = await this.productRepo
      .createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.isDeleted = false')
      .andWhere("(p.parentProductId IS NULL OR p.parentProductId = '')")
      .andWhere("COALESCE(p.metadata ->> 'designGroup', '') <> ''")
      .orderBy("p.metadata ->> 'designGroup'", 'ASC')
      .addOrderBy('p.diamondShape', 'ASC')
      .getMany()

    const map = new Map<string, any>()
    for (const p of rows) {
      const g = (p.metadata as any)?.designGroup
      if (!map.has(g)) map.set(g, { group: g, count: 0, shapes: [], products: [] })
      const entry = map.get(g)
      entry.count++
      if (p.diamondShape && !entry.shapes.includes(p.diamondShape)) {
        entry.shapes.push(p.diamondShape)
      }
      entry.products.push({
        id: p.id,
        productName: p.productName,
        productCode: p.productCode,
        diamondShape: p.diamondShape,
        metalColor: p.metalColor,
        mainImageUrl: p.mainImageUrl,
        status: p.status,
      })
    }
    return [...map.values()]
  }

  // Sibling products that share the same design but differ by diamond shape.
  // The "same design" is linked via metadata.designGroup (set in the admin form).
  // Each sibling is a distinct top-level product = a distinct shape.
  async findByDesignGroup(tenantId: string, designGroup: string): Promise<Product[]> {
    if (!designGroup) return []
    const rows = await this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.media', 'm')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.isDeleted = false')
      .andWhere("p.status = 'active'")
      .andWhere('EXISTS (SELECT 1 FROM jeos_product_media pm WHERE pm.product_id = p.id)')
      .andWhere("(p.parentProductId IS NULL OR p.parentProductId = '')")
      .andWhere("p.metadata ->> 'designGroup' = :dg", { dg: designGroup })
      .orderBy('p.diamondShape', 'ASC')
      .getMany()
    return rows
  }

  async findOne(tenantId: string, id: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id, tenantId, isDeleted: false },
      relations: ['media'],
    })
    if (!product) throw new NotFoundException(`Product ${id} not found`)
    return product
  }

  // Design group (metadata.designGroup) is MANUAL ONLY — set verbatim from
  // whatever the admin form's "Group" field sends, never auto-derived from
  // productCode/productName. (Previously this was auto-derived and silently
  // overwrote any client-provided value on every save — that caused
  // standalone codes like "LR-001" to be mis-grouped by a legacy
  // trailing-number strip, e.g. "LR-001" -> "LR". The admin now types the
  // exact group code they want, e.g. "LR-001" on every shape-variant
  // sibling, and leaves it blank for a standalone product.)

  async create(
    tenantId: string,
    dto: CreateProductDto,
    userId: string,
  ): Promise<Product> {
    const productCode = dto.productCode || `PROD-${Date.now()}`

    // productCode is unique at the DB level even across soft-deleted rows —
    // without this check, re-using a code from a deleted product hit the raw
    // Postgres unique-constraint violation (surfaced to the admin as an
    // opaque "Record already exists (duplicate)"), and the offending row is
    // invisible via search since deleted products are filtered out of every
    // list query. Distinguish the two real cases instead: an ACTIVE product
    // with this code is a genuine conflict (clear error, no silent
    // overwrite); a SOFT-DELETED one is safe to resurrect under the new
    // details, same as upsertByCode() already does for CSV re-import.
    const existing = await this.productRepo.findOne({ where: { tenantId, productCode } })
    if (existing) {
      if (!existing.isDeleted) {
        throw new ConflictException(
          `A product with design number "${productCode}" already exists.`,
        )
      }
      Object.assign(existing, dto, {
        productCode,
        productName: dto.productName ?? '',
        isDeleted: false,
        status: dto.status || (dto as any).productStatus || 'active',
        metalPurity: dto.metalPurity || (dto as any).goldPurity,
      })
      const restored = await this.productRepo.save(existing)
      await this.indexToElasticsearch(restored)
      return restored
    }

    const product = this.productRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      productCode,
      productName: dto.productName ?? '',
      // Resolve ERP aliases: product_status→status, gold_purity→metalPurity
      status: dto.status || (dto as any).productStatus || 'active',
      metalPurity: dto.metalPurity || (dto as any).goldPurity,
    })
    const saved = await this.productRepo.save(product)
    await this.indexToElasticsearch(saved)
    return saved
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateProductDto,
    userId: string,
  ): Promise<Product> {
    const product = await this.findOne(tenantId, id)
    Object.assign(product, dto)
    const saved = await this.productRepo.save(product)
    await this.indexToElasticsearch(saved)
    return saved
  }

  // CSV re-import support: `productCode` is unique at the DB level even for
  // soft-deleted rows, so a plain create() 409s on any code that was ever
  // used before (including by a product someone has since deleted). This
  // looks up by code WITHOUT the isDeleted filter — if a row exists (active
  // or soft-deleted), it's updated in place and restored; otherwise a new
  // product is created exactly like create().
  async upsertByCode(
    tenantId: string,
    dto: CreateProductDto,
    userId: string,
  ): Promise<Product> {
    const productCode = dto.productCode || `PROD-${Date.now()}`
    const existing = await this.productRepo.findOne({ where: { tenantId, productCode } })
    if (existing) {
      Object.assign(existing, dto, {
        productCode,
        productName: dto.productName ?? '',
        isDeleted: false,
        status: dto.status || (dto as any).productStatus || existing.status,
        metalPurity: dto.metalPurity || (dto as any).goldPurity,
      })
      const saved = await this.productRepo.save(existing)
      await this.indexToElasticsearch(saved)
      return saved
    }
    return this.create(tenantId, { ...dto, productCode }, userId)
  }

  async softDelete(tenantId: string, id: string): Promise<{ success: boolean }> {
    const product = await this.findOne(tenantId, id)
    product.isDeleted = true
    await this.productRepo.save(product)
    return { success: true }
  }

  async addMedia(
    tenantId: string,
    productId: string,
    mediaData: Partial<ProductMedia>,
  ): Promise<ProductMedia> {
    // Verify product belongs to tenant
    await this.findOne(tenantId, productId)
    const media = this.mediaRepo.create({ ...mediaData, productId })
    return this.mediaRepo.save(media)
  }

  // Flat /products/media routes (no :id in path) ─────────────────────────────

  async listMedia(productId?: string): Promise<ProductMedia[]> {
    const where: any = {}
    if (productId) where.productId = productId
    return this.mediaRepo.find({ where, order: { sortOrder: 'ASC', createdAt: 'ASC' } })
  }

  async createMedia(body: Record<string, any>): Promise<ProductMedia> {
    const payload = this.normalizeMediaPayload(body)
    const media = this.mediaRepo.create(payload)
    return this.mediaRepo.save(media)
  }

  async bulkCreateMedia(items: Record<string, any>[]): Promise<ProductMedia[]> {
    const entities = items.map(item => this.mediaRepo.create(this.normalizeMediaPayload(item)))
    return this.mediaRepo.save(entities)
  }

  async updateMedia(mediaId: string, body: Record<string, any>): Promise<ProductMedia> {
    const media = await this.mediaRepo.findOneOrFail({ where: { id: mediaId } })
    Object.assign(media, this.normalizeMediaPayload(body))
    return this.mediaRepo.save(media)
  }

  async deleteMediaById(mediaId: string): Promise<{ success: boolean }> {
    const media = await this.mediaRepo.findOne({ where: { id: mediaId } })
    if (!media) throw new NotFoundException(`Media ${mediaId} not found`)
    await this.mediaRepo.remove(media)
    return { success: true }
  }

  async setCover(productId: string, targetId: string, imageIds: string[]): Promise<{ success: boolean }> {
    if (imageIds.length) {
      await this.mediaRepo
        .createQueryBuilder()
        .update()
        .set({ isCover: false } as any)
        .where('id IN (:...ids)', { ids: imageIds })
        .execute()
    }
    await this.mediaRepo.update(targetId, { isCover: true } as any)
    return { success: true }
  }

  async reorderMedia(items: { id: string; sort_order: number }[]): Promise<{ success: boolean }> {
    for (const item of items) {
      await this.mediaRepo.update(item.id, { sortOrder: item.sort_order } as any)
    }
    return { success: true }
  }

  async removeMedia(tenantId: string, mediaId: string): Promise<{ success: boolean }> {
    const media = await this.mediaRepo.findOne({
      where: { id: mediaId },
      relations: ['product'],
    })
    if (!media || media.product?.tenantId !== tenantId) {
      throw new NotFoundException(`Media ${mediaId} not found`)
    }
    await this.mediaRepo.remove(media)
    return { success: true }
  }

  private normalizeMediaPayload(body: Record<string, any>): Partial<ProductMedia> {
    return {
      productId: body.product_id ?? body.productId,
      mediaType: body.media_type ?? body.mediaType ?? 'image',
      fileUrl: body.file_url ?? body.fileUrl,
      fileName: body.file_name ?? body.fileName,
      filePath: body.file_path ?? body.filePath,
      bucketName: body.bucket_name ?? body.bucketName,
      mimeType: body.mime_type ?? body.mimeType,
      fileSize: body.file_size ?? body.fileSize,
      isCover: body.is_cover ?? body.isCover ?? false,
      sortOrder: body.sort_order ?? body.sortOrder ?? 0,
      uploadedBy: body.uploaded_by ?? body.uploadedBy,
      metalColor: body.metal_color ?? body.metalColor,
      title: body.title,
      altText: body.alt_text ?? body.altText,
      seoAltText: body.seo_alt_text ?? body.seoAltText,
    }
  }

  async indexToElasticsearch(product: Product): Promise<void> {
    if (!this.elasticsearchService) return
    try {
      await this.elasticsearchService.index({
        index: this.ES_INDEX,
        id: product.id,
        document: {
          id: product.id,
          tenantId: product.tenantId,
          productName: product.productName,
          productCode: product.productCode,
          description: product.description,
          category: product.category,
          subCategory: product.subCategory,
          metalType: product.metalType,
          metalColor: product.metalColor,
          diamondShape: product.diamondShape,
          status: product.status,
          mainImageUrl: product.mainImageUrl,
          updatedAt: product.updatedAt,
        },
      })
    } catch (err) {
      this.logger.warn(`Elasticsearch indexing failed for product ${product.id}: ${err}`)
    }
  }

  async search(
    tenantId: string,
    q: string,
    page: number = 1,
    limit: number = 20,
  ) {
    if (!this.elasticsearchService) {
      return { data: [], meta: { page, limit, total: 0, totalPages: 0 } }
    }
    try {
      const from = (page - 1) * limit
      const response = await this.elasticsearchService.search({
        index: this.ES_INDEX,
        from,
        size: limit,
        query: {
          bool: {
            must: [
              { term: { tenantId } },
              {
                multi_match: {
                  query: q,
                  fields: ['productName^3', 'productCode^2', 'description', 'category', 'metalType'],
                  fuzziness: 'AUTO',
                },
              },
            ],
          },
        },
      })
      const hits = response.hits.hits
      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : (response.hits.total as { value: number })?.value ?? 0

      return {
        data: hits.map((h) => h._source),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }
    } catch (err) {
      this.logger.warn(`Elasticsearch search failed: ${err}`)
      return { data: [], meta: { page, limit, total: 0, totalPages: 0 } }
    }
  }
}
