import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProductFamily } from '../../../database/entities/product-family.entity'

@Injectable()
export class ProductFamilyService {
  constructor(
    @InjectRepository(ProductFamily)
    private readonly repo: Repository<ProductFamily>,
  ) {}

  list(tenantId: string, status?: string) {
    const where: any = { tenantId, isDeleted: false }
    if (status) where.status = status
    return this.repo.find({ where, order: { createdAt: 'DESC' } })
  }

  async get(tenantId: string, id: string): Promise<ProductFamily> {
    const row = await this.repo.findOne({ where: { id, tenantId, isDeleted: false } })
    if (!row) throw new NotFoundException(`Product family ${id} not found`)
    return row
  }

  create(tenantId: string, dto: Partial<ProductFamily>, userId?: string) {
    const row = this.repo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      status: dto.status || 'draft',
      axes: Array.isArray(dto.axes) ? dto.axes : [],
      masterProducts: Array.isArray(dto.masterProducts) ? dto.masterProducts : [],
    })
    return this.repo.save(row)
  }

  async update(tenantId: string, id: string, dto: Partial<ProductFamily>) {
    const row = await this.get(tenantId, id)
    Object.assign(row, dto)
    return this.repo.save(row)
  }

  async remove(tenantId: string, id: string) {
    const row = await this.get(tenantId, id)
    row.isDeleted = true
    await this.repo.save(row)
    return { success: true }
  }
}
