import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Review } from '../../database/entities/review.entity'

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly repo: Repository<Review>,
  ) {}

  async submit(tenantId: string, body: any): Promise<Review> {
    const review = this.repo.create({
      tenantId,
      productId: body?.productId,
      customerName: body?.customerName ?? null,
      email: body?.email ?? null,
      rating: body?.rating != null ? Number(body.rating) : 5,
      title: body?.title ?? null,
      body: body?.body ?? null,
      status: 'pending',
      isVerifiedPurchase: body?.isVerifiedPurchase === true,
    })
    return this.repo.save(review)
  }

  listApproved(tenantId: string, productId: string): Promise<Review[]> {
    return this.repo.find({
      where: { tenantId, productId, status: 'approved' },
      order: { createdAt: 'DESC' },
    })
  }

  listAll(tenantId: string, query?: { status?: string }): Promise<Review[]> {
    const where: any = { tenantId }
    if (query?.status) where.status = query.status
    return this.repo.find({ where, order: { createdAt: 'DESC' } })
  }

  async moderate(tenantId: string, id: string, status: string): Promise<Review> {
    const review = await this.repo.findOne({ where: { tenantId, id } })
    if (!review) throw new NotFoundException('Review not found')
    review.status = status
    return this.repo.save(review)
  }

  async summary(
    tenantId: string,
    productId: string,
  ): Promise<{ count: number; average: number }> {
    const approved = await this.repo.find({
      where: { tenantId, productId, status: 'approved' },
    })
    const count = approved.length
    const average =
      count > 0
        ? approved.reduce((sum, r) => sum + Number(r.rating || 0), 0) / count
        : 0
    return { count, average }
  }

  async remove(tenantId: string, id: string): Promise<{ success: boolean }> {
    const review = await this.repo.findOne({ where: { tenantId, id } })
    if (!review) throw new NotFoundException('Review not found')
    await this.repo.remove(review)
    return { success: true }
  }
}
