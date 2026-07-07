import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CustomRequest } from '../../database/entities/custom-request.entity'
import { ResizeRepairRequest } from '../../database/entities/resize-repair-request.entity'
import { Appointment } from '../../database/entities/appointment.entity'
import { ContactSubmission } from '../../database/entities/contact-submission.entity'

type AnyRepo = Repository<any>

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(CustomRequest)
    public readonly customRequests: Repository<CustomRequest>,

    @InjectRepository(ResizeRepairRequest)
    public readonly resizeRepairs: Repository<ResizeRepairRequest>,

    @InjectRepository(Appointment)
    public readonly appointments: Repository<Appointment>,

    @InjectRepository(ContactSubmission)
    public readonly contacts: Repository<ContactSubmission>,
  ) {}

  list(repo: AnyRepo, tenantId: string, status?: string) {
    const where: any = { tenantId }
    if (status) where.status = status
    return repo.find({ where, order: { createdAt: 'DESC' } })
  }

  async get(repo: AnyRepo, tenantId: string, id: string) {
    const row = await repo.findOne({ where: { id, tenantId } })
    if (!row) throw new NotFoundException('Submission not found')
    return row
  }

  create(repo: AnyRepo, tenantId: string, dto: any) {
    const row = repo.create({ ...dto, tenantId, status: dto.status || 'new' })
    return repo.save(row)
  }

  async update(repo: AnyRepo, tenantId: string, id: string, dto: any) {
    const row = await this.get(repo, tenantId, id)
    Object.assign(row, dto)
    return repo.save(row)
  }

  async remove(repo: AnyRepo, tenantId: string, id: string) {
    const row = await this.get(repo, tenantId, id)
    await repo.remove(row)
  }
}
