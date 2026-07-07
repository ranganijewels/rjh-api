import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Order } from '../../database/entities/order.entity'
import { Product } from '../../database/entities/product.entity'
import { Customer } from '../../database/entities/customer.entity'

/**
 * AnalyticsService — powers the admin "command center" dashboard.
 * Every number returned here is computed live from the database; the admin
 * dashboard renders exactly what this returns (no hardcoded figures).
 */
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  /** Safe numeric parse — never lets a bad value poison an aggregate with NaN. */
  private toNum(v: any): number {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }

  /** Statuses that count as a completed/won sale for revenue. */
  private isRevenueStatus(status: string): boolean {
    const s = (status || '').toLowerCase()
    return !['draft', 'cancelled', 'canceled', 'refunded'].includes(s)
  }

  async getDashboard(tenantId: string) {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const startOf12mo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

    // Pull all non-deleted orders once; aggregate in memory (volume is modest).
    const orders = await this.orderRepo.find({
      where: { tenantId, isDeleted: false },
      order: { createdAt: 'DESC' },
    })

    let revenueTotal = 0
    let revenueThisMonth = 0
    let revenueLastMonth = 0
    let ordersToday = 0
    let ordersThisMonth = 0
    let pendingCount = 0
    let processingCount = 0
    const statusBreakdown: Record<string, number> = {}
    const trendMap: Record<string, { revenue: number; orders: number }> = {}
    const productAgg: Record<
      string,
      { name: string; code: string; image: string; orders: number; revenue: number }
    > = {}

    // Pre-seed 12-month trend buckets so empty months still render.
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      trendMap[key] = { revenue: 0, orders: 0 }
    }

    for (const o of orders) {
      const amount = this.toNum(o.totalAmount)
      const created = new Date(o.createdAt)
      const status = o.orderStatus || 'Unknown'
      const counts = this.isRevenueStatus(status)

      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1

      const sl = status.toLowerCase()
      if (sl === 'pending' || sl === 'order placed' || sl === 'confirmed') pendingCount++
      if (sl === 'processing' || sl === 'picking' || sl === 'packing' || sl === 'in production')
        processingCount++

      if (counts) {
        revenueTotal += amount
        if (created >= startOfMonth) revenueThisMonth += amount
        else if (created >= startOfLastMonth && created < startOfMonth) revenueLastMonth += amount

        // 12-month trend
        if (created >= startOf12mo) {
          const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`
          if (trendMap[key]) {
            trendMap[key].revenue += amount
            trendMap[key].orders += 1
          }
        }

        // Top products
        const pkey = o.productId || o.productCode || o.productName || 'unknown'
        if (!productAgg[pkey]) {
          productAgg[pkey] = {
            name: o.productName || 'Unknown product',
            code: o.productCode || '',
            image: o.productImageUrl || '',
            orders: 0,
            revenue: 0,
          }
        }
        productAgg[pkey].orders += 1
        productAgg[pkey].revenue += amount
      }

      if (created >= startOfToday) ordersToday++
      if (created >= startOfMonth) ordersThisMonth++
    }

    const totalOrders = orders.length
    const wonOrders = orders.filter((o) => this.isRevenueStatus(o.orderStatus)).length
    const aov = wonOrders > 0 ? revenueTotal / wonOrders : 0
    const revenueGrowthPct =
      revenueLastMonth > 0
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
        : revenueThisMonth > 0
        ? 100
        : 0

    const salesTrend = Object.entries(trendMap).map(([key, v]) => {
      const [y, m] = key.split('-')
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', {
        month: 'short',
      })
      return { month: label, key, revenue: Math.round(v.revenue), orders: v.orders }
    })

    const topProducts = Object.values(productAgg)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
      .map((p) => ({ ...p, revenue: Math.round(p.revenue) }))

    const recentOrders = orders.slice(0, 8).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customer: o.customerName || 'Guest',
      product: o.productName,
      amount: this.toNum(o.totalAmount),
      status: o.orderStatus,
      paymentStatus: o.paymentStatus,
      date: o.createdAt,
    }))

    // Products
    const products = await this.productRepo.find({
      where: { tenantId, isDeleted: false },
    })
    const liveProducts = products.filter((p) => (p.status || '').toLowerCase() === 'active').length

    // Customers
    const customers = await this.customerRepo.count({
      where: { tenantId, isDeleted: false } as any,
    })
    const newCustomers = await this.customerRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.is_deleted = false')
      .andWhere('c.created_at >= :start', { start: startOfMonth })
      .getCount()
      .catch(() => 0)

    return {
      revenue: {
        total: Math.round(revenueTotal),
        thisMonth: Math.round(revenueThisMonth),
        lastMonth: Math.round(revenueLastMonth),
        growthPct: Math.round(revenueGrowthPct * 10) / 10,
      },
      orders: {
        total: totalOrders,
        today: ordersToday,
        thisMonth: ordersThisMonth,
        pending: pendingCount,
        processing: processingCount,
      },
      aov: Math.round(aov),
      statusBreakdown: Object.entries(statusBreakdown).map(([status, count]) => ({
        status,
        count,
      })),
      salesTrend,
      topProducts,
      recentOrders,
      customers: { total: customers, newThisMonth: newCustomers },
      products: { total: products.length, live: liveProducts },
      generatedAt: now.toISOString(),
    }
  }
}
