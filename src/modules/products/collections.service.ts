import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Collection } from '../../database/entities/collection.entity'
import { Product } from '../../database/entities/product.entity'

const slugify = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection) private readonly repo: Repository<Collection>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
  ) {}

  // Members = explicitly assigned ids ∪ products whose collection_name matches
  // the collection name (legacy text field on the product form).
  private memberQuery(tenantId: string, col: Collection, activeOnly: boolean) {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.is_deleted = false')
    if (activeOnly) qb.andWhere("p.status = 'active'")
    const ids = Array.isArray(col.productIds) ? col.productIds.filter(Boolean) : []
    if (ids.length) {
      qb.andWhere('(p.id IN (:...ids) OR LOWER(p.collection_name) = LOWER(:cname))', {
        ids,
        cname: col.name,
      })
    } else {
      qb.andWhere('LOWER(p.collection_name) = LOWER(:cname)', { cname: col.name })
    }
    return qb
  }

  async list(tenantId: string, all = false) {
    const cols = await this.repo.find({
      where: all ? ({ tenantId } as any) : ({ tenantId, status: 'active' } as any),
      order: { sortOrder: 'ASC', name: 'ASC' },
    })
    // Attach product counts (collections are few — a count per row is fine).
    return Promise.all(
      cols.map(async (c) => ({
        ...c,
        productCount: await this.memberQuery(tenantId, c, false).getCount(),
      })),
    )
  }

  async get(tenantId: string, id: string): Promise<Collection> {
    const col = await this.repo.findOne({ where: { id, tenantId } })
    if (!col) throw new NotFoundException(`Collection ${id} not found`)
    return col
  }

  async getWithProducts(tenantId: string, id: string) {
    const col = await this.get(tenantId, id)
    const products = await this.memberQuery(tenantId, col, false)
      .orderBy('p.created_at', 'DESC')
      .getMany()
    return { ...col, products }
  }

  // Storefront: resolve a collection page by slug (active products only).
  async getBySlug(tenantId: string, slug: string) {
    const col = await this.repo.findOne({ where: { tenantId, slug, status: 'active' } })
    if (!col) throw new NotFoundException(`Collection "${slug}" not found`)
    const products = await this.memberQuery(tenantId, col, true)
      .orderBy('p.created_at', 'DESC')
      .getMany()
    return { ...col, products }
  }

  private async uniqueSlug(tenantId: string, base: string, excludeId?: string) {
    let slug = slugify(base) || 'collection'
    let i = 2
    // Append -2, -3… until free (collections are few; loop is fine).
    for (;;) {
      const clash = await this.repo.findOne({ where: { tenantId, slug } })
      if (!clash || clash.id === excludeId) return slug
      slug = `${slugify(base)}-${i++}`
    }
  }

  async create(tenantId: string, dto: Partial<Collection>, userId?: string) {
    if (!dto.name?.trim()) throw new ConflictException('Collection name is required')
    const slug = await this.uniqueSlug(tenantId, dto.slug || dto.name)
    const col = this.repo.create({
      tenantId,
      name: dto.name.trim(),
      slug,
      description: dto.description || null,
      heroImage: dto.heroImage || null,
      sortOrder: dto.sortOrder ?? 0,
      productIds: Array.isArray(dto.productIds) ? dto.productIds : [],
      status: dto.status || 'active',
      createdBy: userId,
    } as Partial<Collection>)
    return this.repo.save(col)
  }

  async update(tenantId: string, id: string, dto: Partial<Collection>) {
    const col = await this.get(tenantId, id)
    const oldName = col.name
    if (dto.slug !== undefined || dto.name !== undefined) {
      col.slug = await this.uniqueSlug(tenantId, dto.slug || dto.name || col.name, id)
    }
    if (dto.name !== undefined) col.name = dto.name.trim()
    if (dto.description !== undefined) col.description = dto.description
    if (dto.heroImage !== undefined) col.heroImage = dto.heroImage
    if (dto.sortOrder !== undefined) col.sortOrder = dto.sortOrder
    if (dto.status !== undefined) col.status = dto.status
    if (Array.isArray(dto.productIds)) col.productIds = dto.productIds
    const saved = await this.repo.save(col)
    // Renaming: keep legacy name-matched members attached by moving their
    // collection_name to the new name.
    if (dto.name && dto.name.trim() !== oldName) {
      await this.productRepo
        .createQueryBuilder()
        .update()
        .set({ collectionName: saved.name })
        .where('tenant_id = :tenantId AND LOWER(collection_name) = LOWER(:old)', {
          tenantId,
          old: oldName,
        })
        .execute()
    }
    return saved
  }

  async remove(tenantId: string, id: string) {
    const col = await this.get(tenantId, id)
    // Detach legacy name-matched products so they don't point at a ghost.
    await this.productRepo
      .createQueryBuilder()
      .update()
      .set({ collectionName: null as any })
      .where('tenant_id = :tenantId AND LOWER(collection_name) = LOWER(:name)', {
        tenantId,
        name: col.name,
      })
      .execute()
    await this.repo.remove(col)
    return { success: true }
  }

  // Replace the assigned product set. Also syncs the products' legacy
  // collection_name field so storefront name-based queries stay consistent:
  //   - every assigned product gets collection_name = collection.name
  //   - products dropped from the set (that pointed here) are cleared
  async assignProducts(tenantId: string, id: string, productIds: string[]) {
    const col = await this.get(tenantId, id)
    const next = [...new Set((productIds || []).filter(Boolean))]
    col.productIds = next
    await this.repo.save(col)

    // Clear products that previously matched this collection but were dropped.
    const clearQb = this.productRepo
      .createQueryBuilder()
      .update()
      .set({ collectionName: null as any })
      .where('tenant_id = :tenantId AND LOWER(collection_name) = LOWER(:name)', {
        tenantId,
        name: col.name,
      })
    if (next.length) clearQb.andWhere('id NOT IN (:...next)', { next })
    await clearQb.execute()

    if (next.length) {
      await this.productRepo
        .createQueryBuilder()
        .update()
        .set({ collectionName: col.name })
        .where('tenant_id = :tenantId AND id IN (:...next)', { tenantId, next })
        .execute()
    }
    return this.getWithProducts(tenantId, id)
  }
}
