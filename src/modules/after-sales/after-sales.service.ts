import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { WarrantyRegistration } from '../../database/entities/warranty-registration.entity'
import { ServiceRequest } from '../../database/entities/service-request.entity'
import { ReturnRma } from '../../database/entities/return-rma.entity'

@Injectable()
export class AfterSalesService {
  constructor(
    @InjectRepository(WarrantyRegistration)
    private readonly warrantyRepo: Repository<WarrantyRegistration>,
    @InjectRepository(ServiceRequest)
    private readonly serviceRepo: Repository<ServiceRequest>,
    @InjectRepository(ReturnRma)
    private readonly rmaRepo: Repository<ReturnRma>,
  ) {}

  // ---------------------------------------------------------------------------
  // Warranty registrations
  // ---------------------------------------------------------------------------
  listWarranties(tenantId: string, query: Record<string, any> = {}) {
    const where: Record<string, any> = { tenantId }
    if (query.status) where.status = query.status
    if (query.customerId) where.customerId = query.customerId
    if (query.orderId) where.orderId = query.orderId
    return this.warrantyRepo.find({ where, order: { createdAt: 'DESC' } })
  }

  async getWarranty(tenantId: string, id: string) {
    const entity = await this.warrantyRepo.findOne({ where: { id, tenantId } })
    if (!entity) throw new NotFoundException('Warranty registration not found')
    return entity
  }

  createWarranty(tenantId: string, body: Record<string, any>, userId?: string) {
    const entity = this.warrantyRepo.create({
      ...body,
      tenantId,
      createdBy: userId,
      status: body.status || 'active',
      registeredAt: body.registeredAt || new Date(),
    })
    return this.warrantyRepo.save(entity)
  }

  async updateWarranty(tenantId: string, id: string, body: Record<string, any>) {
    const entity = await this.getWarranty(tenantId, id)
    Object.assign(entity, body)
    return this.warrantyRepo.save(entity)
  }

  async removeWarranty(tenantId: string, id: string) {
    const entity = await this.getWarranty(tenantId, id)
    await this.warrantyRepo.remove(entity)
    return { success: true }
  }

  // ---------------------------------------------------------------------------
  // Service requests
  // ---------------------------------------------------------------------------
  listServiceRequests(tenantId: string, query: Record<string, any> = {}) {
    const where: Record<string, any> = { tenantId }
    if (query.status) where.status = query.status
    if (query.type) where.type = query.type
    if (query.orderId) where.orderId = query.orderId
    return this.serviceRepo.find({ where, order: { createdAt: 'DESC' } })
  }

  async getServiceRequest(tenantId: string, id: string) {
    const entity = await this.serviceRepo.findOne({ where: { id, tenantId } })
    if (!entity) throw new NotFoundException('Service request not found')
    return entity
  }

  createServiceRequest(tenantId: string, body: Record<string, any>, userId?: string) {
    const entity = this.serviceRepo.create({
      ...body,
      tenantId,
      createdBy: userId,
      type: body.type || 'repair',
      status: body.status || 'open',
    })
    return this.serviceRepo.save(entity)
  }

  async updateServiceRequest(tenantId: string, id: string, body: Record<string, any>) {
    const entity = await this.getServiceRequest(tenantId, id)
    Object.assign(entity, body)
    return this.serviceRepo.save(entity)
  }

  async removeServiceRequest(tenantId: string, id: string) {
    const entity = await this.getServiceRequest(tenantId, id)
    await this.serviceRepo.remove(entity)
    return { success: true }
  }

  // ---------------------------------------------------------------------------
  // Returns / RMAs
  // ---------------------------------------------------------------------------
  listRmas(tenantId: string, query: Record<string, any> = {}) {
    const where: Record<string, any> = { tenantId }
    if (query.status) where.status = query.status
    if (query.type) where.type = query.type
    if (query.orderId) where.orderId = query.orderId
    return this.rmaRepo.find({ where, order: { createdAt: 'DESC' } })
  }

  async getRma(tenantId: string, id: string) {
    const entity = await this.rmaRepo.findOne({ where: { id, tenantId } })
    if (!entity) throw new NotFoundException('Return/RMA not found')
    return entity
  }

  async createRma(tenantId: string, body: Record<string, any>, userId?: string) {
    const rmaNumber = body.rmaNumber || (await this.generateRmaNumber(tenantId))
    const entity = this.rmaRepo.create({
      ...body,
      tenantId,
      createdBy: userId,
      rmaNumber,
      type: body.type || 'return',
      status: body.status || 'requested',
    })
    return this.rmaRepo.save(entity)
  }

  async updateRma(tenantId: string, id: string, body: Record<string, any>) {
    const entity = await this.getRma(tenantId, id)
    Object.assign(entity, body)
    return this.rmaRepo.save(entity)
  }

  async removeRma(tenantId: string, id: string) {
    const entity = await this.getRma(tenantId, id)
    await this.rmaRepo.remove(entity)
    return { success: true }
  }

  private async generateRmaNumber(tenantId: string) {
    const count = await this.rmaRepo.count({ where: { tenantId } })
    return `RMA-${count + 1}`
  }
}
