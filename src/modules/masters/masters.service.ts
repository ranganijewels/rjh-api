import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MasterCategory } from '../../database/entities/master-category.entity'
import { MasterValue } from '../../database/entities/master-value.entity'

@Injectable()
export class MastersService {
  constructor(
    @InjectRepository(MasterCategory)
    private readonly categoryRepo: Repository<MasterCategory>,

    @InjectRepository(MasterValue)
    private readonly valueRepo: Repository<MasterValue>,
  ) {}

  // ─── Categories ───────────────────────────────────────────────────────────

  async getCategories(tenantId: string): Promise<(MasterCategory & { valueCount: number })[]> {
    const categories = await this.categoryRepo
      .createQueryBuilder('cat')
      .leftJoin('cat.values', 'val')
      .addSelect('COUNT(val.id)', 'valueCount')
      .where('cat.tenantId = :tenantId', { tenantId })
      .andWhere('cat.isActive = true')
      .groupBy('cat.id')
      .orderBy('cat.sortOrder', 'ASC')
      .getRawAndEntities()

    return categories.entities.map((cat, idx) => ({
      ...cat,
      valueCount: parseInt(categories.raw[idx]?.valueCount ?? '0', 10),
    }))
  }

  async getCategory(tenantId: string, id: string): Promise<MasterCategory> {
    const category = await this.categoryRepo.findOne({
      where: { id, tenantId },
      relations: ['values'],
    })
    if (!category) throw new NotFoundException('Master category not found')
    return category
  }

  async createCategory(
    tenantId: string,
    dto: Partial<MasterCategory>,
    userId: string,
  ): Promise<MasterCategory> {
    const category = this.categoryRepo.create({ ...dto, tenantId })
    return this.categoryRepo.save(category)
  }

  async updateCategory(
    tenantId: string,
    id: string,
    dto: Partial<MasterCategory>,
    userId: string,
  ): Promise<MasterCategory> {
    const category = await this.getCategory(tenantId, id)
    Object.assign(category, dto)
    return this.categoryRepo.save(category)
  }

  // ─── Values ───────────────────────────────────────────────────────────────

  async getValues(
    tenantId: string,
    categoryId?: string,
    categoryKey?: string,
  ): Promise<MasterValue[]> {
    const qb = this.valueRepo
      .createQueryBuilder('val')
      .leftJoinAndSelect('val.category', 'cat')
      .where('val.tenantId = :tenantId', { tenantId })
      .andWhere('val.isActive = true')

    if (categoryId) {
      qb.andWhere('val.categoryId = :categoryId', { categoryId })
    } else if (categoryKey) {
      qb.andWhere('cat.categoryKey = :categoryKey', { categoryKey })
    }

    return qb.orderBy('val.sortOrder', 'ASC').getMany()
  }

  // Several admin screens (blog/FAQ categories, departments, product category)
  // POST here with a loose `{ category: '<key>', value, label }` shape instead
  // of the entity's real `categoryId` (uuid FK) / `valueKey` / `valueLabel`
  // columns — those extra properties were silently dropped by TypeORM, so
  // every value they "created" saved with categoryId null and no key/label
  // (or failed the categoryId NOT NULL constraint outright). Resolving the
  // aliases here fixes every one of those screens at the source instead of
  // patching each admin route individually.
  private async resolveCategoryId(
    tenantId: string,
    dto: Record<string, any>,
  ): Promise<string | undefined> {
    if (dto.categoryId) return dto.categoryId
    const key = dto.categoryKey || dto.category
    if (!key) return undefined
    const category = await this.categoryRepo.findOne({ where: { tenantId, categoryKey: key } })
    if (!category) throw new NotFoundException(`Master category '${key}' not found`)
    return category.id
  }

  async createValue(
    tenantId: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<MasterValue> {
    const categoryId = await this.resolveCategoryId(tenantId, dto)
    const value = this.valueRepo.create({
      tenantId,
      categoryId,
      valueKey: dto.valueKey ?? dto.value ?? dto.label,
      valueLabel: dto.valueLabel ?? dto.label ?? dto.value,
      description: dto.description,
      metadata: dto.metadata,
      isActive: dto.isActive,
      sortOrder: dto.sortOrder,
    })
    return this.valueRepo.save(value)
  }

  async updateValue(
    tenantId: string,
    id: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<MasterValue> {
    const value = await this.valueRepo.findOne({ where: { id, tenantId } })
    if (!value) throw new NotFoundException('Master value not found')

    // Only known columns — never spread raw `dto` onto the entity, since a
    // stray `category`/`value`/`label` alias would otherwise land on the
    // `category` relation / non-existent properties instead of the real
    // categoryId/valueKey/valueLabel columns.
    const categoryId = await this.resolveCategoryId(tenantId, dto)
    if (categoryId) value.categoryId = categoryId
    if (dto.valueKey ?? dto.value) value.valueKey = dto.valueKey ?? dto.value
    if (dto.valueLabel ?? dto.label) value.valueLabel = dto.valueLabel ?? dto.label
    if (dto.description !== undefined) value.description = dto.description
    if (dto.metadata !== undefined) value.metadata = dto.metadata
    if (dto.isActive !== undefined) value.isActive = dto.isActive
    if (dto.sortOrder !== undefined) value.sortOrder = dto.sortOrder

    return this.valueRepo.save(value)
  }

  async deleteValue(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    const value = await this.valueRepo.findOne({ where: { id, tenantId } })
    if (!value) throw new NotFoundException('Master value not found')

    // Check if the parent category is a system category
    const category = await this.categoryRepo.findOne({ where: { id: value.categoryId } })
    if (category?.isSystem) {
      throw new ForbiddenException('Cannot delete values of system categories')
    }

    await this.valueRepo.remove(value)
    return { deleted: true }
  }
}
