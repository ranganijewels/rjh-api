import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Customer } from '../../database/entities/customer.entity'
import { CustomerAddress } from '../../database/entities/customer-address.entity'
import { PaginationDto, paginate } from '../../common/dto/pagination.dto'

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name)

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,

    @InjectRepository(CustomerAddress)
    private readonly addressRepo: Repository<CustomerAddress>,
  ) {}

  // ─── Customers ───────────────────────────────────────────────────────────

  async getCustomers(tenantId: string, dto: PaginationDto) {
    const qb = this.customerRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.isDeleted = false')

    if (dto.search) {
      qb.andWhere(
        '(c.customerName ILIKE :search OR c.phone ILIKE :search OR c.email ILIKE :search OR c.customerCode ILIKE :search)',
        { search: `%${dto.search}%` },
      )
    }

    const sortField = dto.sortBy || 'createdAt'
    const sortDir = (dto.sortDir?.toUpperCase() as 'ASC' | 'DESC') || 'DESC'
    qb.orderBy(`c.${sortField}`, sortDir)
    qb.skip(dto.skip).take(dto.limit)

    const [data, total] = await qb.getManyAndCount()
    return paginate(data, total, dto)
  }

  async getCustomer(tenantId: string, id: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({
      where: { id, tenantId, isDeleted: false },
      relations: ['addresses'],
    })
    if (!customer) throw new NotFoundException(`Customer ${id} not found`)
    return customer
  }

  async createCustomer(
    tenantId: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<Customer> {
    const customerCode = dto.customerCode || (await this.generateCustomerCode(tenantId))
    const customer = this.customerRepo.create({
      ...dto,
      tenantId,
      customerCode,
      createdBy: userId,
    })
    return this.customerRepo.save(customer)
  }

  async updateCustomer(
    tenantId: string,
    id: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<Customer> {
    const customer = await this.getCustomer(tenantId, id)
    Object.assign(customer, dto)
    return this.customerRepo.save(customer)
  }

  async searchCustomers(tenantId: string, q: string): Promise<Customer[]> {
    if (!q || q.trim().length < 2) return []

    return this.customerRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.isDeleted = false')
      .andWhere(
        '(c.customerName ILIKE :q OR c.phone ILIKE :q OR c.email ILIKE :q OR c.customerCode ILIKE :q OR c.alternatePhone ILIKE :q)',
        { q: `%${q.trim()}%` },
      )
      .orderBy('c.customerName', 'ASC')
      .take(20)
      .getMany()
  }

  // ─── Addresses ───────────────────────────────────────────────────────────

  async getAddresses(tenantId: string, customerId: string): Promise<CustomerAddress[]> {
    // Verify customer belongs to tenant
    await this.getCustomer(tenantId, customerId)

    return this.addressRepo.find({
      where: { customerId },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    })
  }

  async addAddress(
    tenantId: string,
    customerId: string,
    dto: Record<string, any>,
  ): Promise<CustomerAddress> {
    // Verify customer belongs to tenant
    await this.getCustomer(tenantId, customerId)

    // If this is default, unset other defaults
    if (dto.isDefault) {
      await this.addressRepo
        .createQueryBuilder()
        .update(CustomerAddress)
        .set({ isDefault: false })
        .where('customerId = :customerId', { customerId })
        .execute()
    }

    const address = this.addressRepo.create({
      ...dto,
      customerId,
    })
    return this.addressRepo.save(address)
  }

  async updateAddress(
    tenantId: string,
    addressId: string,
    dto: Record<string, any>,
  ): Promise<CustomerAddress> {
    const address = await this.addressRepo.findOne({
      where: { id: addressId },
      relations: ['customer'],
    })
    if (!address || address.customer?.tenantId !== tenantId) {
      throw new NotFoundException(`Address ${addressId} not found`)
    }

    // If setting as default, unset other defaults first
    if (dto.isDefault) {
      await this.addressRepo
        .createQueryBuilder()
        .update(CustomerAddress)
        .set({ isDefault: false })
        .where('customerId = :customerId AND id != :addressId', {
          customerId: address.customerId,
          addressId,
        })
        .execute()
    }

    Object.assign(address, dto)
    return this.addressRepo.save(address)
  }

  async deleteAddress(tenantId: string, addressId: string): Promise<{ success: boolean }> {
    const address = await this.addressRepo.findOne({
      where: { id: addressId },
      relations: ['customer'],
    })
    if (!address || address.customer?.tenantId !== tenantId) {
      throw new NotFoundException(`Address ${addressId} not found`)
    }
    await this.addressRepo.remove(address)
    return { success: true }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async generateCustomerCode(tenantId: string): Promise<string> {
    const count = await this.customerRepo.count({ where: { tenantId } })
    return `CUST-${String(count + 1).padStart(5, '0')}`
  }
}
