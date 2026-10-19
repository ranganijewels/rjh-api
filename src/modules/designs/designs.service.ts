import {
  Injectable,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import { Design } from '../../database/entities/design.entity'
import { DesignMedia } from '../../database/entities/design-media.entity'
import { CreateDesignDto } from './dto/create-design.dto'
import { UpdateDesignDto } from './dto/update-design.dto'
import { DesignFilterDto } from './dto/design-filter.dto'
import { paginate, getSkip } from '../../common/dto/pagination.dto'

@Injectable()
export class DesignsService {
  private readonly logger = new Logger(DesignsService.name)
  private readonly ES_INDEX = 'designs'

  constructor(
    @InjectRepository(Design)
    private readonly designRepo: Repository<Design>,

    @InjectRepository(DesignMedia)
    private readonly mediaRepo: Repository<DesignMedia>,

    @Optional()
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async findAll(tenantId: string, dto: DesignFilterDto) {
    const qb = this.designRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.media', 'media')
      .where('d.tenantId = :tenantId', { tenantId })
      .andWhere('d.isDeleted = false')

    if (dto.search) {
      qb.andWhere(
        '(d.designName ILIKE :search OR d.designCode ILIKE :search)',
        { search: `%${dto.search}%` },
      )
    }
    if (dto.category) qb.andWhere('d.category = :category', { category: dto.category })
    if (dto.metalType) qb.andWhere('d.metalType = :metalType', { metalType: dto.metalType })
    if (dto.metalColor) qb.andWhere('d.metalColor = :metalColor', { metalColor: dto.metalColor })
    if (dto.diamondShape) qb.andWhere('d.diamondShape = :diamondShape', { diamondShape: dto.diamondShape })
    if (dto.status) qb.andWhere('d.status = :status', { status: dto.status })
    if (dto.minWeight !== undefined) qb.andWhere('d.grossWeightG >= :minWeight', { minWeight: dto.minWeight })
    if (dto.maxWeight !== undefined) qb.andWhere('d.grossWeightG <= :maxWeight', { maxWeight: dto.maxWeight })

    const sortField = dto.sortBy || 'createdAt'
    const sortDir = (dto.sortDir?.toUpperCase() as 'ASC' | 'DESC') || 'DESC'
    qb.orderBy(`d.${sortField}`, sortDir)

    qb.skip(getSkip(dto)).take(dto.limit)

    const [data, total] = await qb.getManyAndCount()
    return paginate(data, total, dto)
  }

  async findOne(tenantId: string, id: string): Promise<Design> {
    const design = await this.designRepo.findOne({
      where: { id, tenantId, isDeleted: false },
      relations: ['media'],
    })
    if (!design) throw new NotFoundException(`Design ${id} not found`)
    return design
  }

  async create(
    tenantId: string,
    dto: CreateDesignDto,
    userId: string,
  ): Promise<Design> {
    const design = this.designRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      designCode: dto.designCode || `DSN-${Date.now()}`,
    })
    const saved = await this.designRepo.save(design)
    await this.indexToElasticsearch(saved)
    return saved
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateDesignDto,
    userId: string,
  ): Promise<Design> {
    const design = await this.findOne(tenantId, id)
    Object.assign(design, dto)
    const saved = await this.designRepo.save(design)
    await this.indexToElasticsearch(saved)
    return saved
  }

  async softDelete(tenantId: string, id: string): Promise<{ success: boolean }> {
    const design = await this.findOne(tenantId, id)
    design.isDeleted = true
    await this.designRepo.save(design)
    return { success: true }
  }

  async addMedia(
    tenantId: string,
    designId: string,
    mediaData: Partial<DesignMedia>,
  ): Promise<DesignMedia> {
    await this.findOne(tenantId, designId)
    const media = this.mediaRepo.create({ ...mediaData, designId })
    return this.mediaRepo.save(media)
  }

  async removeMedia(tenantId: string, mediaId: string): Promise<{ success: boolean }> {
    const media = await this.mediaRepo.findOne({
      where: { id: mediaId },
      relations: ['design'],
    })
    if (!media || media.design?.tenantId !== tenantId) {
      throw new NotFoundException(`Media ${mediaId} not found`)
    }
    await this.mediaRepo.remove(media)
    return { success: true }
  }

  async indexToElasticsearch(design: Design): Promise<void> {
    if (!this.elasticsearchService) return
    try {
      await this.elasticsearchService.index({
        index: this.ES_INDEX,
        id: design.id,
        document: {
          id: design.id,
          tenantId: design.tenantId,
          designName: design.designName,
          designCode: design.designCode,
          description: design.description,
          category: design.category,
          metalType: design.metalType,
          metalColor: design.metalColor,
          diamondShape: design.diamondShape,
          status: design.status,
          grossWeightG: design.grossWeightG,
          mainImageUrl: design.mainImageUrl,
          updatedAt: design.updatedAt,
        },
      })
    } catch (err) {
      this.logger.warn(`Elasticsearch indexing failed for design ${design.id}: ${err}`)
    }
  }

  async search(
    tenantId: string,
    q: string,
    page: number = 1,
    limit: number = 20,
  ) {
    if (!this.elasticsearchService) {
      return { data: [], meta: { page, limit, total: 0, totalPages: 0 } }
    }
    try {
      const from = (page - 1) * limit
      const response = await this.elasticsearchService.search({
        index: this.ES_INDEX,
        from,
        size: limit,
        query: {
          bool: {
            must: [
              { term: { tenantId } },
              {
                multi_match: {
                  query: q,
                  fields: ['designName^3', 'designCode^2', 'description', 'category', 'metalType'],
                  fuzziness: 'AUTO',
                },
              },
            ],
          },
        },
      })
      const hits = response.hits.hits
      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : (response.hits.total as { value: number })?.value ?? 0

      return {
        data: hits.map((h) => h._source),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }
    } catch (err) {
      this.logger.warn(`Elasticsearch search failed: ${err}`)
      return { data: [], meta: { page, limit, total: 0, totalPages: 0 } }
    }
  }
}
