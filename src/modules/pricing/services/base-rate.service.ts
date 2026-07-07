import { NotFoundException } from '@nestjs/common'
import { Repository, ObjectLiteral } from 'typeorm'

// Shared CRUD for effective-dated master tables. Concrete services inject their
// repository and add domain-specific resolution. History is preserved by NEVER
// updating rate values in place — callers create new effective-dated rows.
export abstract class BaseRateService<T extends ObjectLiteral & { id: string; tenantId: string }> {
  protected constructor(protected readonly repo: Repository<T>) {}

  list(tenantId: string, where: Partial<T> = {}) {
    return this.repo.find({
      where: { tenantId, ...where } as any,
      order: { effectiveDate: 'DESC', createdAt: 'DESC' } as any,
    })
  }

  listActive(tenantId: string) {
    return this.repo.find({
      where: { tenantId, status: 'active' } as any,
      order: { effectiveDate: 'DESC' } as any,
    })
  }

  async get(tenantId: string, id: string): Promise<T> {
    const row = await this.repo.findOne({ where: { id, tenantId } as any })
    if (!row) throw new NotFoundException(`${this.repo.metadata.name} ${id} not found`)
    return row
  }

  async create(tenantId: string, dto: Partial<T>, userId?: string): Promise<T> {
    const row = this.repo.create({
      ...(dto as any),
      tenantId,
      createdBy: userId,
      effectiveDate: (dto as any).effectiveDate ?? new Date(),
    })
    return this.repo.save(row as any)
  }

  async bulkCreate(tenantId: string, items: Partial<T>[], userId?: string): Promise<T[]> {
    const rows = items.map((dto) =>
      this.repo.create({
        ...(dto as any),
        tenantId,
        createdBy: userId,
        effectiveDate: (dto as any).effectiveDate ?? new Date(),
      }),
    )
    return this.repo.save(rows as any)
  }

  async update(tenantId: string, id: string, dto: Partial<T>): Promise<T> {
    const row = await this.get(tenantId, id)
    Object.assign(row, dto)
    return this.repo.save(row as any)
  }

  async remove(tenantId: string, id: string): Promise<{ success: boolean }> {
    const row = await this.get(tenantId, id)
    await this.repo.remove(row)
    return { success: true }
  }

  // Resolve the latest active row whose effectiveDate <= asOf, among candidates
  // that satisfy `predicate`. Most specific match wins via the caller's scoring.
  protected pickEffective(rows: T[], asOf: Date, predicate: (r: T) => boolean): T | null {
    const eligible = rows
      .filter((r: any) => r.status === 'active')
      .filter((r: any) => !r.effectiveDate || new Date(r.effectiveDate) <= asOf)
      .filter(predicate)
      .sort(
        (a: any, b: any) =>
          new Date(b.effectiveDate || 0).getTime() - new Date(a.effectiveDate || 0).getTime(),
      )
    return eligible[0] ?? null
  }
}
