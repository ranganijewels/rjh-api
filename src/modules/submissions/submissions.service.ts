import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CustomRequest } from '../../database/entities/custom-request.entity'
import { ResizeRepairRequest } from '../../database/entities/resize-repair-request.entity'
import { Appointment } from '../../database/entities/appointment.entity'
import { ContactSubmission } from '../../database/entities/contact-submission.entity'
import { EmailService } from '../../infrastructure/email/email.service'

// Expert-consultation slots: Mon–Fri, 09:00–18:00 US Eastern, 30 minutes each.
const SLOT_TZ = 'America/New_York'
const SLOT_STARTS: string[] = []
for (let h = 9; h < 18; h++) SLOT_STARTS.push(`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`)

function easternNow(): { ymd: string; hm: string; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SLOT_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value || ''
  const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[get('weekday') as string] ?? 0
  return { ymd: `${get('year')}-${get('month')}-${get('day')}`, hm: `${get('hour')}:${get('minute')}`, weekday: wd }
}

function weekdayOf(ymd: string): number {
  // Noon UTC avoids DST edge cases when deriving the weekday of a calendar date.
  return new Date(`${ymd}T12:00:00Z`).getUTCDay()
}

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

    private readonly email: EmailService,
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

  // ─── Expert appointments (30-min slots, Mon–Fri 9–18 US Eastern) ─────────

  async appointmentSlots(tenantId: string, date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new BadRequestException('date must be YYYY-MM-DD')
    const wd = weekdayOf(date)
    if (wd === 0 || wd === 6) return { date, open: false, slots: [] }
    const now = easternNow()
    if (date < now.ymd) return { date, open: false, slots: [] }
    const booked = await this.appointments.find({
      where: { tenantId, preferredDate: date as any },
    })
    const taken = new Set(
      booked
        .filter((b) => b.status !== 'cancelled')
        .map((b) => String(b.preferredTime || '').slice(0, 5)),
    )
    const slots = SLOT_STARTS.map((t) => ({
      time: t,
      available: !taken.has(t) && !(date === now.ymd && t <= now.hm),
    }))
    return { date, open: true, timezone: SLOT_TZ, slots }
  }

  async bookAppointment(tenantId: string, dto: any) {
    const date = String(dto.date || dto.preferredDate || '').slice(0, 10)
    const slot = String(dto.slot || dto.preferredTime || '').slice(0, 5)
    if (!dto.name || !dto.email) throw new BadRequestException('name and email are required')
    if (!SLOT_STARTS.includes(slot)) throw new BadRequestException('invalid slot')
    const day = await this.appointmentSlots(tenantId, date)
    const found = day.slots.find((x) => x.time === slot)
    if (!day.open || !found || !found.available)
      throw new ConflictException('That slot is no longer available — please pick another.')

    const row = this.appointments.create({
      tenantId,
      name: dto.name,
      email: dto.email,
      phone: dto.phone || null,
      preferredDate: date as any,
      preferredTime: slot,
      location: 'virtual',
      notes: [dto.productName ? `Product: ${dto.productName} (${dto.productId || ''})` : '', dto.message || '']
        .filter(Boolean)
        .join('\n'),
      status: 'pending',
    })
    const saved = await this.appointments.save(row)

    // Notifications — best-effort (EmailService logs+swallows failures).
    const when = `${date} at ${slot} (US Eastern)`
    const store = process.env.SMTP_USER || 'info@ranganijewelry.com'
    await this.email.sendMail(
      dto.email,
      'Your Rangani Jewelry consultation is booked',
      `<p>Dear ${dto.name},</p><p>Your 30-minute expert consultation is booked for <b>${when}</b>.</p>` +
        (dto.productName ? `<p>Regarding: <b>${dto.productName}</b></p>` : '') +
        `<p>We'll contact you at this email${dto.phone ? ' or ' + dto.phone : ''} to confirm.</p><p>— Rangani Jewelry House</p>`,
    )
    await this.email.sendMail(
      store,
      `New consultation booking — ${date} ${slot}`,
      `<p><b>${dto.name}</b> booked ${when}.</p><p>Email: ${dto.email}<br>Phone: ${dto.phone || '—'}</p>` +
        (dto.productName ? `<p>Product: ${dto.productName} (${dto.productId || ''})</p>` : '') +
        (dto.message ? `<p>Message: ${dto.message}</p>` : ''),
    )
    return saved
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
