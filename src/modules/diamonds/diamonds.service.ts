import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Diamond } from '../../database/entities/diamond.entity'
import { DiamondParcel } from '../../database/entities/diamond-parcel.entity'
import { PaginationDto } from '../../common/dto/pagination.dto'

const VALID_LABS = ['IGI', 'GIA', 'HRD', 'GCAL', 'IGL', 'none']

@Injectable()
export class DiamondsService {
  constructor(
    @InjectRepository(Diamond)
    private readonly diamondRepository: Repository<Diamond>,
    @InjectRepository(DiamondParcel)
    private readonly parcelRepository: Repository<DiamondParcel>,
  ) {}

  async getDiamonds(
    tenantId: string,
    dto: PaginationDto & {
      shape?: string
      color?: string
      clarity?: string
      minCarat?: number
      maxCarat?: number
      status?: string
      lab?: string
    },
  ): Promise<{ data: Diamond[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, shape, color, clarity, minCarat, maxCarat, status, lab } = dto
    const skip = (page - 1) * limit

    const qb = this.diamondRepository
      .createQueryBuilder('diamond')
      .where('diamond.tenantId = :tenantId', { tenantId })

    if (shape) qb.andWhere('diamond.shape = :shape', { shape })
    if (color) qb.andWhere('diamond.color = :color', { color })
    if (clarity) qb.andWhere('diamond.clarity = :clarity', { clarity })
    if (status) qb.andWhere('diamond.status = :status', { status })
    if (lab) qb.andWhere('diamond.lab = :lab', { lab })
    if (minCarat !== undefined)
      qb.andWhere('diamond.carat >= :minCarat', { minCarat: Number(minCarat) })
    if (maxCarat !== undefined)
      qb.andWhere('diamond.carat <= :maxCarat', { maxCarat: Number(maxCarat) })

    qb.skip(skip).take(limit).orderBy('diamond.createdAt', 'DESC')

    const [data, total] = await qb.getManyAndCount()
    return { data, total, page, limit }
  }

  async getDiamond(tenantId: string, id: string): Promise<Diamond> {
    const diamond = await this.diamondRepository.findOne({
      where: { id, tenantId },
    })
    if (!diamond) {
      throw new NotFoundException(`Diamond with id ${id} not found`)
    }
    return diamond
  }

  async createDiamond(
    tenantId: string,
    dto: Record<string, unknown>,
    userId: string,
  ): Promise<Diamond> {
    const lab = dto.lab as string | undefined
    if (lab && !VALID_LABS.includes(lab)) {
      throw new BadRequestException(
        `Invalid lab. Must be one of: ${VALID_LABS.join(', ')}`,
      )
    }

    const diamond = this.diamondRepository.create({
      ...dto,
      tenantId,
      createdBy: userId,
    })
    return this.diamondRepository.save(diamond)
  }

  async updateDiamond(
    tenantId: string,
    id: string,
    dto: Record<string, unknown>,
    userId: string,
  ): Promise<Diamond> {
    const diamond = await this.getDiamond(tenantId, id)

    const lab = dto.lab as string | undefined
    if (lab && !VALID_LABS.includes(lab)) {
      throw new BadRequestException(
        `Invalid lab. Must be one of: ${VALID_LABS.join(', ')}`,
      )
    }

    Object.assign(diamond, { ...dto, updatedBy: userId })
    return this.diamondRepository.save(diamond)
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: string,
    userId: string,
  ): Promise<Diamond> {
    const diamond = await this.getDiamond(tenantId, id)
    diamond.status = status as any
    ;(diamond as any).updatedBy = userId
    return this.diamondRepository.save(diamond)
  }

  async getParcels(
    tenantId: string,
    dto: PaginationDto,
  ): Promise<{ data: DiamondParcel[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20 } = dto
    const skip = (page - 1) * limit

    const [data, total] = await this.parcelRepository.findAndCount({
      where: { tenantId },
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    })
    return { data, total, page, limit }
  }

  async getParcel(tenantId: string, id: string): Promise<DiamondParcel> {
    const parcel = await this.parcelRepository.findOne({
      where: { id, tenantId },
    })
    if (!parcel) {
      throw new NotFoundException(`Diamond parcel with id ${id} not found`)
    }
    return parcel
  }

  async createParcel(
    tenantId: string,
    dto: Record<string, unknown>,
    userId: string,
  ): Promise<DiamondParcel> {
    const parcel = this.parcelRepository.create({
      ...dto,
      tenantId,
      createdBy: userId,
    })
    return this.parcelRepository.save(parcel)
  }

  async updateParcel(
    tenantId: string,
    id: string,
    dto: Record<string, unknown>,
    userId: string,
  ): Promise<DiamondParcel> {
    const parcel = await this.getParcel(tenantId, id)
    Object.assign(parcel, { ...dto, updatedBy: userId })
    return this.parcelRepository.save(parcel)
  }

  async getDiamondHoldings(
    tenantId: string,
  ): Promise<{ status: string; count: string; totalCarat: string }[]> {
    return this.diamondRepository
      .createQueryBuilder('diamond')
      .select('diamond.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(diamond.carat)', 'totalCarat')
      .where('diamond.tenantId = :tenantId', { tenantId })
      .groupBy('diamond.status')
      .getRawMany()
  }

  async matchPairs(
    tenantId: string,
    params: {
      color?: string
      clarity?: string
      carat?: number
      tolerance?: number
    },
  ): Promise<Diamond[]> {
    const { color, clarity, carat, tolerance = 0.1 } = params

    const qb = this.diamondRepository
      .createQueryBuilder('diamond')
      .where('diamond.tenantId = :tenantId', { tenantId })
      .andWhere('diamond.status = :status', { status: 'available' })

    if (color) qb.andWhere('diamond.color = :color', { color })
    if (clarity) qb.andWhere('diamond.clarity = :clarity', { clarity })
    if (carat !== undefined) {
      qb.andWhere('diamond.carat BETWEEN :minCarat AND :maxCarat', {
        minCarat: Number(carat) - tolerance,
        maxCarat: Number(carat) + tolerance,
      })
    }

    return qb.orderBy('diamond.carat', 'ASC').getMany()
  }
}
