import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ILike, Repository } from 'typeorm'
import { Account } from '../../database/entities/account.entity'

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly repo: Repository<Account>,
  ) {}

  async list(tenantId: string, q: any = {}): Promise<Account[]> {
    const where: any = { tenantId }
    if (q?.type) where.type = q.type
    if (q?.status) where.status = q.status
    if (q?.parentAccountId) where.parentAccountId = q.parentAccountId
    if (q?.search) where.name = ILike(`%${q.search}%`)
    return this.repo.find({ where, order: { createdAt: 'DESC' } })
  }

  async get(tenantId: string, id: string): Promise<Account> {
    const account = await this.repo.findOne({ where: { id, tenantId } })
    if (!account) throw new NotFoundException('Account not found')
    return account
  }

  async create(tenantId: string, body: any, createdBy?: string): Promise<Account> {
    const account = this.repo.create({ ...body, tenantId, createdBy }) as unknown as Account
    return this.repo.save(account)
  }

  async update(tenantId: string, id: string, body: any): Promise<Account> {
    const account = await this.get(tenantId, id)
    delete body?.id
    delete body?.tenantId
    Object.assign(account, body)
    return this.repo.save(account)
  }

  async remove(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    const account = await this.get(tenantId, id)
    await this.repo.remove(account)
    return { deleted: true }
  }

  /**
   * resolveForCustomer — given a customer's type (retail | wholesale | corporate |
   * b2b | franchise ...), find the matching account entitlement for the tenant.
   * Returns the first active account whose type matches the customerType, falling
   * back to a direct status-only match. Returns null when nothing applies (b2c
   * defaults handled by the caller / price-book resolution).
   */
  async resolveForCustomer(tenantId: string, customerType?: string): Promise<Account | null> {
    if (!customerType) return null
    const type = String(customerType).toLowerCase()
    const account = await this.repo.findOne({
      where: { tenantId, type, status: 'active' },
      order: { createdAt: 'DESC' },
    })
    return account ?? null
  }
}
