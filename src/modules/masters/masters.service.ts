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

  async createValue(
    tenantId: string,
    dto: Partial<MasterValue>,
    userId: string,
  ): Promise<MasterValue> {
    const value = this.valueRepo.create({ ...dto, tenantId })
    return this.valueRepo.save(value)
  }

  async updateValue(
    tenantId: string,
    id: string,
    dto: Partial<MasterValue>,
    userId: string,
  ): Promise<MasterValue> {
    const value = await this.valueRepo.findOne({ where: { id, tenantId } })
    if (!value) throw new NotFoundException('Master value not found')
    Object.assign(value, dto)
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
