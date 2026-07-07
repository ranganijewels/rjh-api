import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CatalogMaster } from '../../../database/entities/catalog-master.entity'

@Injectable()
export class CatalogMasterService {
  constructor(
    @InjectRepository(CatalogMaster)
    private readonly repo: Repository<CatalogMaster>,
  ) {}

  list(tenantId: string, kind?: string, includeInactive = false) {
    const where: any = { tenantId }
    if (kind) where.kind = kind
    if (!includeInactive) where.status = 'active'
    return this.repo.find({ where, order: { kind: 'ASC', sortOrder: 'ASC', name: 'ASC' } })
  }

  /** All distinct kinds present for a tenant (drives the admin kind picker). */
  async kinds(tenantId: string): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('m')
      .select('DISTINCT m.kind', 'kind')
      .where('m.tenant_id = :tenantId', { tenantId })
      .orderBy('m.kind', 'ASC')
      .getRawMany()
    return rows.map((r) => r.kind)
  }

  async get(tenantId: string, id: string): Promise<CatalogMaster> {
    const row = await this.repo.findOne({ where: { id, tenantId } })
    if (!row) throw new NotFoundException(`Catalog master ${id} not found`)
    return row
  }

  create(tenantId: string, dto: Partial<CatalogMaster>, userId?: string) {
    const row = this.repo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      status: dto.status || 'active',
      code: (dto.code || '').trim(),
    })
    return this.repo.save(row)
  }

  async bulkCreate(tenantId: string, items: Partial<CatalogMaster>[], userId?: string) {
    const rows = items.map((i) =>
      this.repo.create({ ...i, tenantId, createdBy: userId, status: i.status || 'active' }),
    )
    return this.repo.save(rows)
  }

  async update(tenantId: string, id: string, dto: Partial<CatalogMaster>) {
    const row = await this.get(tenantId, id)
    Object.assign(row, dto)
    return this.repo.save(row)
  }

  async remove(tenantId: string, id: string) {
    const row = await this.get(tenantId, id)
    await this.repo.remove(row)
    return { success: true }
  }
}
