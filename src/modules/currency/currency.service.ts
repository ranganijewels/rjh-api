import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Currency } from '../../database/entities/currency.entity'

// Seed set — major target markets. Canada intentionally excluded.
// rate = 1 USD in that currency (approx defaults; refreshed live via refreshRates()).
const SEED: Array<Partial<Currency>> = [
  { countryCode: 'US', countryName: 'United States', currencyCode: 'USD', currencySymbol: '$', rate: 1, isDefault: true, sortOrder: 1 },
  { countryCode: 'GB', countryName: 'United Kingdom', currencyCode: 'GBP', currencySymbol: '£', rate: 0.79, sortOrder: 2 },
  { countryCode: 'AU', countryName: 'Australia', currencyCode: 'AUD', currencySymbol: 'A$', rate: 1.52, sortOrder: 3 },
  { countryCode: 'AE', countryName: 'United Arab Emirates', currencyCode: 'AED', currencySymbol: 'د.إ', rate: 3.67, sortOrder: 4 },
  { countryCode: 'DE', countryName: 'Germany', currencyCode: 'EUR', currencySymbol: '€', rate: 0.92, sortOrder: 5 },
  { countryCode: 'FR', countryName: 'France', currencyCode: 'EUR', currencySymbol: '€', rate: 0.92, sortOrder: 6 },
  { countryCode: 'IT', countryName: 'Italy', currencyCode: 'EUR', currencySymbol: '€', rate: 0.92, sortOrder: 7 },
  { countryCode: 'SG', countryName: 'Singapore', currencyCode: 'SGD', currencySymbol: 'S$', rate: 1.35, sortOrder: 8 },
  { countryCode: 'NZ', countryName: 'New Zealand', currencyCode: 'NZD', currencySymbol: 'NZ$', rate: 1.65, sortOrder: 9 },
  { countryCode: 'SA', countryName: 'Saudi Arabia', currencyCode: 'SAR', currencySymbol: '﷼', rate: 3.75, sortOrder: 10 },
  { countryCode: 'IN', countryName: 'India', currencyCode: 'INR', currencySymbol: '₹', rate: 83.2, sortOrder: 11 },
  { countryCode: 'JP', countryName: 'Japan', currencyCode: 'JPY', currencySymbol: '¥', rate: 151, sortOrder: 12 },
]

@Injectable()
export class CurrencyService implements OnModuleInit {
  private readonly logger = new Logger(CurrencyService.name)

  constructor(
    @InjectRepository(Currency)
    private readonly repo: Repository<Currency>,
  ) {}

  async onModuleInit() {
    // Auto-seed the default tenant on first boot so the storefront has data.
    const defaultTenant = '00000000-0000-0000-0000-000000000001'
    const count = await this.repo.count({ where: { tenantId: defaultTenant } })
    if (count === 0) {
      await this.seed(defaultTenant)
      this.logger.log(`Seeded ${SEED.length} currencies for default tenant`)
    }
  }

  async seed(tenantId: string) {
    const rows = SEED.map((c) => this.repo.create({ ...c, tenantId }))
    return this.repo.save(rows)
  }

  listActive(tenantId: string) {
    return this.repo.find({
      where: { tenantId, isActive: true },
      order: { sortOrder: 'ASC', countryName: 'ASC' },
    })
  }

  listAll(tenantId: string) {
    return this.repo.find({
      where: { tenantId },
      order: { sortOrder: 'ASC', countryName: 'ASC' },
    })
  }

  async getDefault(tenantId: string): Promise<Currency | null> {
    return (
      (await this.repo.findOne({ where: { tenantId, isDefault: true } })) ??
      (await this.repo.findOne({
        where: { tenantId, isActive: true },
        order: { sortOrder: 'ASC' },
      }))
    )
  }

  async get(tenantId: string, id: string) {
    const row = await this.repo.findOne({ where: { id, tenantId } })
    if (!row) throw new NotFoundException('Currency not found')
    return row
  }

  async create(tenantId: string, dto: Partial<Currency>) {
    const row = this.repo.create({
      ...dto,
      tenantId,
      countryCode: (dto.countryCode || '').toUpperCase().slice(0, 2),
      currencyCode: (dto.currencyCode || '').toUpperCase().slice(0, 3),
    })
    if (row.isDefault) await this.clearDefault(tenantId)
    return this.repo.save(row)
  }

  async update(tenantId: string, id: string, dto: Partial<Currency>) {
    const row = await this.get(tenantId, id)
    if (dto.isDefault) await this.clearDefault(tenantId)
    if (dto.countryCode) dto.countryCode = dto.countryCode.toUpperCase().slice(0, 2)
    if (dto.currencyCode) dto.currencyCode = dto.currencyCode.toUpperCase().slice(0, 3)
    Object.assign(row, dto)
    return this.repo.save(row)
  }

  async remove(tenantId: string, id: string) {
    const row = await this.get(tenantId, id)
    await this.repo.remove(row)
    return { success: true }
  }

  async setDefault(tenantId: string, id: string) {
    await this.clearDefault(tenantId)
    const row = await this.get(tenantId, id)
    row.isDefault = true
    row.isActive = true
    return this.repo.save(row)
  }

  private async clearDefault(tenantId: string) {
    await this.repo.update({ tenantId, isDefault: true }, { isDefault: false })
  }

  // Detect the visitor's country from their IP and return the matching currency.
  async detectByIp(tenantId: string, ip: string): Promise<Currency> {
    const fallback = await this.getDefault(tenantId)
    const clean = this.normalizeIp(ip)
    if (!clean) return fallback

    try {
      const res = await fetch(
        `http://ip-api.com/json/${clean}?fields=status,countryCode`,
        { signal: AbortSignal.timeout(2500) },
      )
      const json: any = await res.json()
      if (json?.status === 'success' && json.countryCode) {
        const match = await this.repo.findOne({
          where: { tenantId, countryCode: json.countryCode, isActive: true },
        })
        if (match) return match
      }
    } catch (err) {
      this.logger.warn(`Geo lookup failed for ${clean}: ${(err as Error).message}`)
    }
    return fallback
  }

  private normalizeIp(ip: string): string | null {
    if (!ip) return null
    // x-forwarded-for may be a list; take the first
    let first = ip.split(',')[0].trim()
    if (first.startsWith('::ffff:')) first = first.slice(7)
    // Skip local/private addresses — ip-api can't resolve them
    if (
      first === '::1' ||
      first === '127.0.0.1' ||
      first.startsWith('10.') ||
      first.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(first)
    ) {
      return null
    }
    return first
  }

  // Pull live FX rates (base USD) from a free, key-less provider and persist.
  async refreshRates(tenantId: string) {
    let rates: Record<string, number> = {}
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: AbortSignal.timeout(5000),
      })
      const json: any = await res.json()
      rates = json?.rates || {}
    } catch (err) {
      this.logger.error(`Rate refresh failed: ${(err as Error).message}`)
      throw new NotFoundException('Live rate provider unavailable')
    }

    const all = await this.listAll(tenantId)
    const now = new Date()
    let updated = 0
    for (const c of all) {
      const r = rates[c.currencyCode]
      if (typeof r === 'number' && r > 0) {
        c.rate = r
        c.ratesUpdatedAt = now
        updated++
      }
    }
    await this.repo.save(all)
    return { success: true, updated, updatedAt: now }
  }
}
