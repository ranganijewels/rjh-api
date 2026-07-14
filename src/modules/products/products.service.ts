import {
  Injectable,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import { Product } from '../../database/entities/product.entity'
import { ProductMedia } from '../../database/entities/product-media.entity'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { ProductFilterDto } from './dto/product-filter.dto'
import { paginate } from '../../common/dto/pagination.dto'

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
    // Categorical filters use case-insensitive partial match so storefront short codes
    // (e.g. "YELLOW", "Round") match stored labels (e.g. "Yellow Gold", "Round Brilliant").
    if (dto.category) qb.andWhere('p.category ILIKE :category', { category: `%${dto.category}%` })
    if (dto.metalType) qb.andWhere('p.metalType ILIKE :metalType', { metalType: `%${dto.metalType}%` })
    if (dto.metalColor) qb.andWhere('p.metalColor ILIKE :metalColor', { metalColor: `%${dto.metalColor}%` })
    if (dto.diamondShape) qb.andWhere('p.diamondShape ILIKE :diamondShape', { diamondShape: `%${dto.diamondShape}%` })
    if (dto.status) {
      // 'active' is the storefront canonical value; also match ERP statuses 'Published' and 'Approved'
      const statuses = dto.status.toLowerCase() === 'active'
        ? ['active', 'Published', 'Approved']
        : [dto.status]
      qb.andWhere('p.status IN (:...statuses)', { statuses })
    }
    // Price is computed by the Pricing Engine from master data (never stored),
    // so price-range filtering is intentionally not a DB column filter here.

    const sortField = dto.sortBy || 'createdAt'
    const sortDir = (dto.sortDir?.toUpperCase() as 'ASC' | 'DESC') || 'DESC'
    qb.orderBy(`p.${sortField}`, sortDir)

    qb.skip(dto.skip).take(dto.limit)

    const [data, total] = await qb.getManyAndCount()
    return paginate(data, total, dto)
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

  // Diamond-shape codes recognized as a trailing suffix, e.g. "LR-001-RND" →
  // family "LR-001". Mirrors the admin form's client-side hint (and the
  // seeded diamond_shape catalog master) — kept as a static list here so
  // deriving a design group never needs an extra DB round trip on save.
  private static readonly SHAPE_CODES = [
    'RND', 'OVL', 'PRI', 'EMR', 'EME', 'CUS', 'ELC', 'PEA', 'MAR', 'RAD', 'ASC', 'HRT',
  ]

  // Design group auto-derives from the DESIGN NUMBER (productCode).
  // ENTERPRISE convention: a trailing shape-code token is stripped first, so
  // "LR-001-RND" / "LR-001-OVL" both link as group "LR-001" (this is the
  // AUTHORITATIVE derivation — it always overwrites whatever the client sent,
  // see withDerivedDesignGroup below — so it must recognize the same
  // convention the admin form's UI hint does, or the two silently disagree).
  // LEGACY fallback: the code minus its trailing NUMERIC suffix, so
  // "NIRVANA-003" and "NIRVANA-007" link as group "NIRVANA". Products
  // without a design number fall back to the leading words of the product
  // name (before the carat token).
  static deriveDesignGroup(designNo?: string, productName?: string): string {
    const clean = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40)
    const code = (designNo || '').trim()
    if (code) {
      const shapeMatch = code.match(/^(.*?)[-_ ]+([A-Za-z]{2,4})$/)
      if (shapeMatch && ProductsService.SHAPE_CODES.includes(shapeMatch[2].toUpperCase())) {
        const fam = clean(shapeMatch[1])
        if (fam) return fam
      }
      // Strip a trailing run of digits (with optional separator): "RJ-RING-01" → "RJ-RING"
      const base = code.replace(/[-_ ]*\d+$/g, '').trim()
      const derived = clean(base || code)
      if (derived) return derived
    }
    const name = (productName || '').trim()
    if (!name) return ''
    const norm = name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    const m = norm.match(/^(.*?)(?=\s+(?:\d|[¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]))/u)
    return clean(m ? m[1] : norm.split(/\s+/).slice(0, 2).join(' '))
  }

  private withDerivedDesignGroup(
    metadata: Record<string, any> | undefined,
    productCode?: string,
    productName?: string,
  ): Record<string, any> {
    const md = { ...(metadata || {}) }
    const derived = ProductsService.deriveDesignGroup(productCode, productName)
    if (derived) md.designGroup = derived
    return md
  }

  async create(
    tenantId: string,
    dto: CreateProductDto,
    userId: string,
  ): Promise<Product> {
    const productCode = dto.productCode || `PROD-${Date.now()}`
    const product = this.productRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      productCode,
      // Resolve ERP aliases: product_status→status, gold_purity→metalPurity
      status: dto.status || (dto as any).productStatus || 'active',
      metalPurity: dto.metalPurity || (dto as any).goldPurity,
      metadata: this.withDerivedDesignGroup(
        (dto as any).metadata,
        dto.productCode,
        (dto as any).productName,
      ),
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
    // Re-derive from the (possibly updated) design number / name so the group
    // always tracks the design number — no manual field anywhere.
    product.metadata = this.withDerivedDesignGroup(
      product.metadata,
      product.productCode,
      (product as any).productName,
    )
    const saved = await this.productRepo.save(product)
    await this.indexToElasticsearch(saved)
    return saved
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
