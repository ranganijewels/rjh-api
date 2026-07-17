import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Order } from '../../database/entities/order.entity'
import { JobCard, ProductionStatus } from '../../database/entities/job-card.entity'
import { Customer } from '../../database/entities/customer.entity'
import { Product } from '../../database/entities/product.entity'
import { Design } from '../../database/entities/design.entity'
import { PaginationDto, paginate, getSkip } from '../../common/dto/pagination.dto'

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name)

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,

    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Design)
    private readonly designRepo: Repository<Design>,
  ) {}

  // ─── Orders ───────────────────────────────────────────────────────────────

  async getOrders(
    tenantId: string,
    dto: PaginationDto,
    userId?: string,
    role?: string,
  ) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.customer', 'customer')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.isDeleted = false')

    // Customers can only see their own orders
    if (role === 'customer' && userId) {
      const customer = await this.customerRepo.findOne({
        where: { createdBy: userId, tenantId, isDeleted: false },
      })
      if (customer) {
        qb.andWhere('o.customerId = :customerId', { customerId: customer.id })
      } else {
        // Return empty if no customer profile found
        qb.andWhere('1 = 0')
      }
    }

    if (dto.search) {
      qb.andWhere(
        '(o.orderNumber ILIKE :search OR o.customerName ILIKE :search OR o.customerPhone ILIKE :search)',
        { search: `%${dto.search}%` },
      )
    }

    const sortField = dto.sortBy || 'createdAt'
    const sortDir = (dto.sortDir?.toUpperCase() as 'ASC' | 'DESC') || 'DESC'
    qb.orderBy(`o.${sortField}`, sortDir)
    qb.skip(getSkip(dto)).take(dto.limit)

    const [data, total] = await qb.getManyAndCount()
    return paginate(data, total, dto)
  }

  async getOrder(tenantId: string, id: string): Promise<Order & { jobCard?: JobCard }> {
    const order = await this.orderRepo.findOne({
      where: { id, tenantId, isDeleted: false },
      relations: ['customer', 'product', 'design'],
    })
    if (!order) throw new NotFoundException(`Order ${id} not found`)

    // Attach job card if linked
    let jobCard: JobCard | undefined
    if (order.jobCardId) {
      jobCard = await this.jobCardRepo.findOne({ where: { id: order.jobCardId } }) ?? undefined
    }

    return { ...order, jobCard }
  }

  async createOrder(
    tenantId: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<Order> {
    const orderNumber = await this.generateOrderNumber(tenantId)
    const order = this.orderRepo.create({
      ...dto,
      tenantId,
      orderNumber,
      createdBy: userId,
      orderStatus: dto.orderStatus || 'Draft',
      orderDate: dto.orderDate || new Date().toISOString().slice(0, 10),
    })
    return this.orderRepo.save(order)
  }

  async updateStatus(
    tenantId: string,
    id: string,
    body: string | Record<string, any>,
    userId: string,
  ): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id, tenantId, isDeleted: false },
    })
    if (!order) throw new NotFoundException(`Order ${id} not found`)

    // Back-compat: a bare string is just a status change
    const patch = typeof body === 'string' ? { status: body } : body || {}

    if (patch.status) order.orderStatus = patch.status
    if (patch.paymentStatus) order.paymentStatus = patch.paymentStatus
    if (patch.trackingNumber !== undefined) order.trackingNumber = patch.trackingNumber
    if (patch.courierName !== undefined) order.courierName = patch.courierName
    if (patch.trackingUrl !== undefined) order.trackingUrl = patch.trackingUrl
    if (patch.orderNotes !== undefined) order.orderNotes = patch.orderNotes
    // Guarded total correction (adjustments / repairing legacy bad totals).
    // Only accept a finite, non-negative number — never store NaN.
    if (patch.totalAmount !== undefined) {
      const n = Number(patch.totalAmount)
      if (Number.isFinite(n) && n >= 0) order.totalAmount = n
    }

    // Stamp fulfillment timestamps on transition
    const s = (patch.status || order.orderStatus || '').toLowerCase()
    if ((s === 'shipped' || s === 'shipping') && !order.shippedAt) order.shippedAt = new Date()
    if (s === 'delivered' && !order.deliveredAt) order.deliveredAt = new Date()

    return this.orderRepo.save(order)
  }

  // ─── Job Cards ───────────────────────────────────────────────────────────

  async createJobCard(
    tenantId: string,
    orderId: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<JobCard> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, tenantId, isDeleted: false },
    })
    if (!order) throw new NotFoundException(`Order ${orderId} not found`)

    if (order.jobCardId) {
      throw new BadRequestException('This order already has a job card')
    }

    const jobCardNumber = await this.generateJobCardNumber(tenantId)
    const jobCard = this.jobCardRepo.create({
      ...dto,
      tenantId,
      jobCardNumber,
      linkedOrderId: orderId,
      customerName: dto.customerName || order.customerName,
      customerPhone: dto.customerPhone || order.customerPhone,
      productId: dto.productId || order.productId,
      productName: dto.productName || order.productName,
      productCode: dto.productCode || order.productCode,
      designId: dto.designId || order.designId,
      designName: dto.designName || order.designName,
      designCode: dto.designCode || order.designCode,
      metalType: dto.metalType || order.metalType,
      metalPurity: dto.metalPurity || order.metalPurity,
      metalColor: dto.metalColor || order.metalColor,
      grossWeightG: dto.grossWeightG || order.grossWeightG,
      netWeightG: dto.netWeightG || order.netWeightG,
      diamondWeightCt: dto.diamondWeightCt || order.diamondWeightCt,
      diamondShape: dto.diamondShape || order.diamondShape,
      diamondQuality: dto.diamondQuality || order.diamondQuality,
      productSize: dto.productSize || order.productSize,
      quantity: dto.quantity || order.quantity,
      orderDate: dto.orderDate || order.orderDate,
      dueDate: dto.dueDate || order.dueDate,
      productionStatus: ProductionStatus.PENDING,
      createdBy: userId,
    })

    const savedJobCard = await this.jobCardRepo.save(jobCard)

    // Link job card back to order
    order.jobCardId = savedJobCard.id
    order.jobCardStatus = savedJobCard.productionStatus
    await this.orderRepo.save(order)

    return savedJobCard
  }

  async updateJobCard(
    tenantId: string,
    jobCardId: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<JobCard> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, tenantId, isDeleted: false },
    })
    if (!jobCard) throw new NotFoundException(`Job card ${jobCardId} not found`)

    Object.assign(jobCard, dto)
    return this.jobCardRepo.save(jobCard)
  }

  async updateJobCardStatus(
    tenantId: string,
    jobCardId: string,
    status: ProductionStatus,
    userId: string,
  ): Promise<JobCard> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, tenantId, isDeleted: false },
    })
    if (!jobCard) throw new NotFoundException(`Job card ${jobCardId} not found`)

    if (!Object.values(ProductionStatus).includes(status)) {
      throw new BadRequestException(`Invalid production status: ${status}`)
    }

    jobCard.productionStatus = status

    // Set dispatch timestamp when dispatched
    if (status === ProductionStatus.DISPATCHED) {
      jobCard.dispatchedAt = new Date().toISOString()
    }

    const saved = await this.jobCardRepo.save(jobCard)

    // Sync status back to the linked order
    if (jobCard.linkedOrderId) {
      await this.orderRepo.update(
        { id: jobCard.linkedOrderId, tenantId },
        { jobCardStatus: status },
      )
    }

    return saved
  }

  async getJobCards(tenantId: string, dto: PaginationDto) {
    const qb = this.jobCardRepo
      .createQueryBuilder('jc')
      .where('jc.tenantId = :tenantId', { tenantId })
      .andWhere('jc.isDeleted = false')

    if (dto.search) {
      qb.andWhere(
        '(jc.jobCardNumber ILIKE :search OR jc.customerName ILIKE :search OR jc.productName ILIKE :search)',
        { search: `%${dto.search}%` },
      )
    }

    const sortField = dto.sortBy || 'createdAt'
    const sortDir = (dto.sortDir?.toUpperCase() as 'ASC' | 'DESC') || 'DESC'
    qb.orderBy(`jc.${sortField}`, sortDir)
    qb.skip(getSkip(dto)).take(dto.limit)

    const [data, total] = await qb.getManyAndCount()
    return paginate(data, total, dto)
  }

  async getJobCard(tenantId: string, id: string): Promise<JobCard> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id, tenantId, isDeleted: false },
      relations: ['linkedOrder', 'product', 'design'],
    })
    if (!jobCard) throw new NotFoundException(`Job card ${id} not found`)
    return jobCard
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const count = await this.orderRepo.count({ where: { tenantId } })
    return `ORD-${date}-${String(count + 1).padStart(3, '0')}`
  }

  private async generateJobCardNumber(tenantId: string): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const count = await this.jobCardRepo.count({ where: { tenantId } })
    return `JC-${date}-${String(count + 1).padStart(3, '0')}`
  }
}
