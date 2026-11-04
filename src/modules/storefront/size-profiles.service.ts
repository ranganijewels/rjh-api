import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CustomerSizeProfile } from '../../database/entities/customer-size-profile.entity'

const MAX_PROFILES = 20

// Only these fields are taken from the request body.
type SizeProfileInput = {
  name?: string
  ringSize?: string | null
  weddingBandSize?: string | null
  braceletSize?: string | null
  necklaceLength?: string | null
}

const clean = (v: unknown, max: number): string | null => {
  if (v === undefined || v === null) return null
  const s = String(v).trim().slice(0, max)
  return s || null
}

@Injectable()
export class SizeProfilesService {
  constructor(
    @InjectRepository(CustomerSizeProfile)
    private readonly repo: Repository<CustomerSizeProfile>,
  ) {}

  list(userId: string): Promise<CustomerSizeProfile[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'ASC' } })
  }

  async create(userId: string, tenantId: string, dto: SizeProfileInput): Promise<CustomerSizeProfile> {
    const name = clean(dto.name, 100)
    if (!name) throw new BadRequestException('Give the profile a name')
    if ((await this.repo.count({ where: { userId } })) >= MAX_PROFILES) {
      throw new BadRequestException(`You can save up to ${MAX_PROFILES} size profiles`)
    }
    return this.repo.save(this.repo.create({ userId, tenantId, name, ...this.sizes(dto) }))
  }

  async update(userId: string, id: string, dto: SizeProfileInput): Promise<CustomerSizeProfile> {
    const profile = await this.repo.findOne({ where: { id, userId } })
    if (!profile) throw new NotFoundException('Size profile not found')
    if (dto.name !== undefined) {
      const name = clean(dto.name, 100)
      if (!name) throw new BadRequestException('Give the profile a name')
      profile.name = name
    }
    Object.assign(profile, this.sizes(dto, true))
    return this.repo.save(profile)
  }

  async remove(userId: string, id: string): Promise<void> {
    const profile = await this.repo.findOne({ where: { id, userId } })
    if (!profile) throw new NotFoundException('Size profile not found')
    await this.repo.remove(profile)
  }

  // On update, fields missing from the body are left as they are.
  private sizes(dto: SizeProfileInput, partial = false) {
    const out: Partial<CustomerSizeProfile> = {}
    for (const key of ['ringSize', 'weddingBandSize', 'braceletSize', 'necklaceLength'] as const) {
      if (partial && dto[key] === undefined) continue
      out[key] = clean(dto[key], 20)
    }
    return out
  }
}
