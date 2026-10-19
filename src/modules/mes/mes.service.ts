import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { WorkCenter } from '../../database/entities/work-center.entity'
import { ProductionOrder } from '../../database/entities/production-order.entity'
import { ProductionJobStep } from '../../database/entities/production-job-step.entity'

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001'

const DEFAULT_WORK_CENTERS = [
  'Design', 'CAD', 'CAD Approval', 'CAM', 'Casting', 'Assembly',
  'Stone Setting', 'Polishing', 'QC', 'Certification', 'Packaging', 'Dispatch',
]

@Injectable()
export class MesService {
  constructor(
    @InjectRepository(WorkCenter)
    private readonly workCenterRepo: Repository<WorkCenter>,
    @InjectRepository(ProductionOrder)
    private readonly orderRepo: Repository<ProductionOrder>,
    @InjectRepository(ProductionJobStep)
    private readonly stepRepo: Repository<ProductionJobStep>,
  ) {}

  // ─── Seeding ───────────────────────────────────────────────────────────────

  async seedDefaults(): Promise<void> {
    const existing = await this.workCenterRepo.count({ where: { tenantId: DEFAULT_TENANT } })
    if (existing > 0) return
    const rows = DEFAULT_WORK_CENTERS.map((name, i) =>
      this.workCenterRepo.create({
        tenantId: DEFAULT_TENANT,
        code: name.toUpperCase().replace(/\s+/g, '_'),
        name,
        sortOrder: i + 1,
        stdMinutes: 0,
        status: 'active',
      }),
    )
    await this.workCenterRepo.save(rows)
  }

  // ─── Work Centers CRUD ──────────────────────────────────────────────────────

  listWorkCenters(tenantId: string) {
    return this.workCenterRepo.find({
      where: { tenantId },
      order: { sortOrder: 'ASC' },
    })
  }

  async getWorkCenter(tenantId: string, id: string) {
    const wc = await this.workCenterRepo.findOne({ where: { id, tenantId } })
    if (!wc) throw new NotFoundException('Work center not found')
    return wc
  }

  createWorkCenter(tenantId: string, body: any, userId?: string) {
    const wc = this.workCenterRepo.create({ ...body, tenantId, createdBy: userId })
    return this.workCenterRepo.save(wc)
  }

  async updateWorkCenter(tenantId: string, id: string, body: any) {
    const wc = await this.getWorkCenter(tenantId, id)
    Object.assign(wc, body)
    return this.workCenterRepo.save(wc)
  }

  async removeWorkCenter(tenantId: string, id: string) {
    const wc = await this.getWorkCenter(tenantId, id)
    await this.workCenterRepo.remove(wc)
    return { success: true }
  }

  // ─── Production Orders ───────────────────────────────────────────────────────

  async createProductionOrder(tenantId: string, body: any, userId?: string) {
    const count = await this.orderRepo.count({ where: { tenantId } })
    const orderNo = `PO-${count + 1}`

    const order = this.orderRepo.create({
      tenantId,
      orderNo,
      source: body?.source ?? 'sales',
      orderId: body?.orderId ?? null,
      productId: body?.productId ?? null,
      productCode: body?.productCode ?? null,
      variantCode: body?.variantCode ?? null,
      qty: body?.qty ?? 1,
      priority: body?.priority ?? 'normal',
      dueDate: body?.dueDate ?? null,
      status: 'created',
      currentStep: 0,
      createdBy: userId,
    })
    const saved = await this.orderRepo.save(order)

    // Build routing from active work centers (ordered by sortOrder)
    let centers = await this.workCenterRepo.find({
      where: { tenantId, status: 'active' },
      order: { sortOrder: 'ASC' },
    })
    if (centers.length === 0) {
      await this.seedDefaults()
      centers = await this.workCenterRepo.find({
        where: { tenantId, status: 'active' },
        order: { sortOrder: 'ASC' },
      })
    }

    const steps = centers.map((wc, i) =>
      this.stepRepo.create({
        tenantId,
        productionOrderId: saved.id,
        workCenterId: wc.id,
        workCenterCode: wc.code,
        stepNo: i + 1,
        status: i === 0 ? 'pending' : 'pending',
        scrapQty: 0,
        photoAssetIds: [],
        createdBy: userId,
      }),
    )
    await this.stepRepo.save(steps)

    return this.getOrder(tenantId, saved.id)
  }

  listOrders(tenantId: string, query: { status?: string } = {}) {
    const where: any = { tenantId }
    if (query?.status) where.status = query.status
    return this.orderRepo.find({ where, order: { createdAt: 'DESC' } })
  }

  async getOrder(tenantId: string, id: string) {
    const order = await this.orderRepo.findOne({ where: { id, tenantId } })
    if (!order) throw new NotFoundException('Production order not found')
    const steps = await this.listSteps(tenantId, id)
    return { ...order, steps }
  }

  listSteps(tenantId: string, productionOrderId: string) {
    return this.stepRepo.find({
      where: { tenantId, productionOrderId },
      order: { stepNo: 'ASC' },
    })
  }

  async advanceStep(tenantId: string, productionOrderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: productionOrderId, tenantId } })
    if (!order) throw new NotFoundException('Production order not found')

    const steps = await this.listSteps(tenantId, productionOrderId)
    if (steps.length === 0) throw new NotFoundException('No job steps for this production order')

    // Find current open step (first not done/skipped)
    const current = steps.find((s) => s.status !== 'done' && s.status !== 'skipped')
    if (!current) {
      // Everything already completed
      order.status = 'completed'
      await this.orderRepo.save(order)
      return this.getOrder(tenantId, productionOrderId)
    }

    // Mark current step done
    current.status = 'done'
    current.finishedAt = new Date()
    if (!current.startedAt) current.startedAt = new Date()
    await this.stepRepo.save(current)

    // Find next step
    const next = steps.find((s) => s.stepNo > current.stepNo && s.status !== 'done' && s.status !== 'skipped')
    if (next) {
      next.status = 'in_progress'
      if (!next.startedAt) next.startedAt = new Date()
      await this.stepRepo.save(next)
      order.currentStep = next.stepNo
      order.status = 'in_progress'
    } else {
      // No remaining steps → order completed
      order.currentStep = current.stepNo
      order.status = 'completed'
    }
    await this.orderRepo.save(order)

    return this.getOrder(tenantId, productionOrderId)
  }
}
