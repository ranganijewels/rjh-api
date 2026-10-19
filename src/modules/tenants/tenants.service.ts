import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { Tenant } from '../../database/entities/tenant.entity'
import { User } from '../../database/entities/user.entity'

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } })
    if (!tenant) {
      throw new NotFoundException(`Tenant with id ${id} not found`)
    }
    return tenant
  }

  async getTenants(): Promise<Tenant[]> {
    return this.tenantRepository.find({ order: { createdAt: 'DESC' } })
  }

  async createTenant(dto: {
    name: string
    slug: string
    settings?: Record<string, unknown>
    adminEmail?: string
    adminPassword?: string
    adminFullName?: string
  }): Promise<Tenant> {
    const existing = await this.tenantRepository.findOne({
      where: { slug: dto.slug },
    })
    if (existing) {
      throw new ConflictException(`Tenant with slug "${dto.slug}" already exists`)
    }

    const tenant = this.tenantRepository.create({
      name: dto.name,
      slug: dto.slug,
      settings: dto.settings ?? {},
    })
    const savedTenant = await this.tenantRepository.save(tenant)

    // Create a super_admin user for this tenant
    const email = dto.adminEmail ?? `admin@${dto.slug}.com`
    const rawPassword = dto.adminPassword ?? 'ChangeMe@123'
    const hashedPassword = await bcrypt.hash(rawPassword, 10)

    const superAdmin = this.userRepository.create({
      tenantId: savedTenant.id,
      email,
      passwordHash: hashedPassword,
      fullName: dto.adminFullName ?? `${dto.name} Admin`,
      role: 'super_admin',
      isActive: true,
    })
    await this.userRepository.save(superAdmin)

    return savedTenant
  }

  async updateTenant(
    id: string,
    dto: {
      name?: string
      settings?: Record<string, unknown>
    },
  ): Promise<Tenant> {
    const tenant = await this.findById(id)
    Object.assign(tenant, dto)
    return this.tenantRepository.save(tenant)
  }

  async getTenantSettings(id: string): Promise<Record<string, unknown>> {
    const tenant = await this.findById(id)
    return (tenant.settings as Record<string, unknown>) ?? {}
  }
}
