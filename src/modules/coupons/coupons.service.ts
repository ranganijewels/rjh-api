import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Coupon } from '../../database/entities/coupon.entity'

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly repo: Repository<Coupon>,
  ) {}

  list(tenantId: string) {
    return this.repo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    })
  }

  async get(tenantId: string, id: string) {
    const coupon = await this.repo.findOne({ where: { id, tenantId } })
    if (!coupon) throw new NotFoundException('Coupon not found')
    return coupon
  }

  async getByCode(tenantId: string, code: string) {
    const coupon = await this.repo.findOne({
      where: { tenantId, code: code.toUpperCase() },
    })
    if (!coupon) throw new NotFoundException('Coupon not found')
    return coupon
  }

  async create(tenantId: string, dto: Partial<Coupon>, userId: string) {
    if (!dto.code) throw new BadRequestException('Coupon code is required')
    const coupon = this.repo.create({
      ...dto,
      tenantId,
      code: dto.code.toUpperCase(),
      createdBy: userId,
      usedCount: 0,
    })
    return this.repo.save(coupon)
  }

  async update(tenantId: string, id: string, dto: Partial<Coupon>) {
    const coupon = await this.get(tenantId, id)
    if (dto.code) dto.code = dto.code.toUpperCase()
    Object.assign(coupon, dto)
    return this.repo.save(coupon)
  }

  async remove(tenantId: string, id: string) {
    const coupon = await this.get(tenantId, id)
    await this.repo.remove(coupon)
  }

  async validate(tenantId: string, code: string, orderTotal: number) {
    const coupon = await this.getByCode(tenantId, code)
    const now = new Date()

    if (!coupon.isActive) {
      throw new BadRequestException('Coupon is inactive')
    }
    if (coupon.startsAt && new Date(coupon.startsAt) > now) {
      throw new BadRequestException('Coupon not yet active')
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
      throw new BadRequestException('Coupon has expired')
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Coupon usage limit reached')
    }
    if (coupon.minOrderValue && orderTotal < Number(coupon.minOrderValue)) {
      throw new BadRequestException(
        `Order total must be at least $${coupon.minOrderValue} to use this coupon`,
      )
    }

    const discount =
      coupon.discountType === 'percent'
        ? Math.min(
            (orderTotal * Number(coupon.discountValue)) / 100,
            coupon.maxDiscount ? Number(coupon.maxDiscount) : Infinity,
          )
        : Math.min(Number(coupon.discountValue), orderTotal)

    return { coupon, discount: Math.round(discount * 100) / 100 }
  }

  async incrementUse(tenantId: string, code: string) {
    await this.repo.increment({ tenantId, code: code.toUpperCase() } as any, 'usedCount', 1)
  }
}
