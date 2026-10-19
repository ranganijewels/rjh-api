import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AttributeDefinition } from '../../database/entities/attribute-definition.entity'
import { AttributeValue } from '../../database/entities/attribute-value.entity'
import { Product } from '../../database/entities/product.entity'

@Injectable()
export class PimService {
  constructor(
    @InjectRepository(AttributeDefinition)
    private readonly defRepo: Repository<AttributeDefinition>,
    @InjectRepository(AttributeValue)
    private readonly valRepo: Repository<AttributeValue>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // ─── AttributeDefinition CRUD ───────────────────────────────────────────────

  listDefinitions(tenantId: string, groupName?: string) {
    const where: Record<string, any> = { tenantId }
    if (groupName) where.groupName = groupName
    return this.defRepo.find({
      where,
      order: { sortOrder: 'ASC', label: 'ASC' },
    })
  }

  async getDefinition(tenantId: string, id: string) {
    const row = await this.defRepo.findOne({ where: { id, tenantId } })
    if (!row) throw new NotFoundException('Attribute definition not found')
    return row
  }

  createDefinition(tenantId: string, body: any, userId?: string) {
    const row = this.defRepo.create({
      ...body,
      tenantId,
      createdBy: userId,
    })
    return this.defRepo.save(row)
  }

  async updateDefinition(tenantId: string, id: string, body: any) {
    const row = await this.getDefinition(tenantId, id)
    delete body.id
    delete body.tenantId
    Object.assign(row, body)
    return this.defRepo.save(row)
  }

  async removeDefinition(tenantId: string, id: string) {
    const row = await this.getDefinition(tenantId, id)
    await this.defRepo.remove(row)
    return { success: true }
  }

  // ─── AttributeValue (per-product) ───────────────────────────────────────────

  async setValue(
    tenantId: string,
    input: { productId: string; attributeId: string; locale?: string; value?: any },
    userId?: string,
  ) {
    const locale = input.locale || 'en'
    const value =
      input.value === undefined || input.value === null
        ? null
        : String(input.value)

    let row = await this.valRepo.findOne({
      where: {
        tenantId,
        productId: input.productId,
        attributeId: input.attributeId,
        locale,
      },
    })

    if (row) {
      row.value = value
    } else {
      row = this.valRepo.create({
        tenantId,
        productId: input.productId,
        attributeId: input.attributeId,
        locale,
        value,
        createdBy: userId,
      })
    }
    return this.valRepo.save(row)
  }

  getValues(tenantId: string, productId: string) {
    return this.valRepo.find({
      where: { tenantId, productId },
      order: { attributeId: 'ASC', locale: 'ASC' },
    })
  }

  // ─── Completeness (lifecycle) ───────────────────────────────────────────────

  async completeness(tenantId: string, productId: string) {
    const required = await this.defRepo.find({
      where: { tenantId, isRequired: true, status: 'active' },
    })
    const values = await this.valRepo.find({
      where: { tenantId, productId },
    })

    // an attribute is "filled" if it has at least one non-empty value (any locale)
    const filledIds = new Set(
      values
        .filter((v) => v.value !== null && v.value !== undefined && String(v.value).trim() !== '')
        .map((v) => v.attributeId),
    )

    const missing = required
      .filter((d) => !filledIds.has(d.id))
      .map((d) => d.code)

    const requiredCount = required.length
    const filledCount = requiredCount - missing.length
    const percent =
      requiredCount === 0 ? 100 : Math.round((filledCount / requiredCount) * 100)

    return { requiredCount, filledCount, percent, missing }
  }
}
