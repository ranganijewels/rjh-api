import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource, Between } from 'typeorm'
import { Order } from '../../database/entities/order.entity'
import { Product } from '../../database/entities/product.entity'
import { InventoryItem, ItemStatus } from '../../database/entities/inventory-item.entity'
import { PurchaseOrder, PurchaseOrderStatus } from '../../database/entities/purchase-order.entity'
import { Customer } from '../../database/entities/customer.entity'

interface InventorySummary {
  byStatus: Record<string, { count: number; totalValue: number }>
  byLocation: Record<string, number>
  totalItems: number
  totalValue: number
}

interface SalesSummary {
  byStatus: Record<string, { count: number; totalAmount: number }>
  totalOrders: number
  totalRevenue: number
  from: Date
  to: Date
}

interface AgingBucket {
  label: string
  count: number
  totalAmount: number
  poIds: string[]
}

interface JobCardStatusSummary {
  byStatus: Record<string, number>
  total: number
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(InventoryItem)
    private readonly inventoryRepo: Repository<InventoryItem>,

    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepo: Repository<PurchaseOrder>,

    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,

    private readonly dataSource: DataSource,
  ) {}

  async getInventorySummary(tenantId: string): Promise<InventorySummary> {
    const items = await this.inventoryRepo.find({
      where: { tenantId, isDeleted: false },
      relations: ['currentLocation'],
    })

    const byStatus: Record<string, { count: number; totalValue: number }> = {}
    const byLocation: Record<string, number> = {}
    let totalValue = 0

    for (const item of items) {
      // By status
      const status = item.itemStatus
      if (!byStatus[status]) byStatus[status] = { count: 0, totalValue: 0 }
      byStatus[status].count++
      const val = Number(item.purchasePrice || 0) * Number(item.currentQuantity || 1)
      byStatus[status].totalValue += val
      totalValue += val

      // By location
      const loc = item.currentLocation?.id ?? 'unassigned'
      byLocation[loc] = (byLocation[loc] || 0) + 1
    }

    return { byStatus, byLocation, totalItems: items.length, totalValue }
  }

  async getSalesSummary(tenantId: string, from: Date, to: Date): Promise<SalesSummary> {
    const orders = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.tenantId = :tenantId', { tenantId })
      .andWhere('order.isDeleted = false')
      .andWhere('order.createdAt >= :from', { from })
      .andWhere('order.createdAt <= :to', { to })
      .getMany()

    const byStatus: Record<string, { count: number; totalAmount: number }> = {}
    let totalRevenue = 0

    for (const order of orders) {
      const status = order.orderStatus || 'Unknown'
      if (!byStatus[status]) byStatus[status] = { count: 0, totalAmount: 0 }
      byStatus[status].count++
      const amount = Number(order.totalAmount || 0)
      byStatus[status].totalAmount += amount
      totalRevenue += amount
    }

    return { byStatus, totalOrders: orders.length, totalRevenue, from, to }
  }

  async getProcurementAging(tenantId: string): Promise<AgingBucket[]> {
    const pos = await this.purchaseOrderRepo
      .createQueryBuilder('po')
      .where('po.tenantId = :tenantId', { tenantId })
      .andWhere('po.status NOT IN (:...closedStatuses)', {
        closedStatuses: [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED],
      })
      .getMany()

    const buckets: AgingBucket[] = [
      { label: '0-30 days', count: 0, totalAmount: 0, poIds: [] },
      { label: '31-60 days', count: 0, totalAmount: 0, poIds: [] },
      { label: '61-90 days', count: 0, totalAmount: 0, poIds: [] },
      { label: '90+ days', count: 0, totalAmount: 0, poIds: [] },
    ]

    const now = new Date()

    for (const po of pos) {
      const orderDate = new Date(po.orderDate)
      const ageDays = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
      const amount = Number(po.totalAmount || 0)

      let bucket: AgingBucket
      if (ageDays <= 30) bucket = buckets[0]
      else if (ageDays <= 60) bucket = buckets[1]
      else if (ageDays <= 90) bucket = buckets[2]
      else bucket = buckets[3]

      bucket.count++
      bucket.totalAmount += amount
      bucket.poIds.push(po.id)
    }

    return buckets
  }

  async getJobCardStatus(tenantId: string): Promise<JobCardStatusSummary> {
    const result = await this.dataSource.query(
      `SELECT job_card_status, COUNT(*) as count
       FROM jeos_orders
       WHERE tenant_id = $1
         AND is_deleted = false
         AND job_card_status IS NOT NULL
       GROUP BY job_card_status`,
      [tenantId],
    )

    const byStatus: Record<string, number> = {}
    let total = 0

    for (const row of result) {
      const count = parseInt(row.count, 10)
      byStatus[row.job_card_status] = count
      total += count
    }

    return { byStatus, total }
  }
}
