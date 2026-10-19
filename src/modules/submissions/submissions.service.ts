import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CustomRequest } from '../../database/entities/custom-request.entity'
import { ResizeRepairRequest } from '../../database/entities/resize-repair-request.entity'
import { Appointment } from '../../database/entities/appointment.entity'
import { ContactSubmission } from '../../database/entities/contact-submission.entity'
import { MarketingService } from '../marketing/marketing.service'
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

const esc = (v: any) =>
  String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

const NOTIFY_TO = () => process.env.CONTACT_NOTIFY_EMAIL || 'contact@ranganijewelry.com,info@ranganijewelry.com'

// Inbox triage flags (computed, nothing stored): staff/QA test entries and
// anything still "new" after 2 days.
const OVERDUE_MS = 2 * 24 * 60 * 60 * 1000
function looksLikeTest(row: any): boolean {
  const email = String(row?.email || row?.customerEmail || '').toLowerCase()
  const name = String(row?.name || row?.fullName || row?.customerName || '').toLowerCase()
  const domain = email.split('@')[1] || ''
  return (
    ['rjhouse.com', 'therjhouse.com', 'example.com', 'test.com', 'mailinator.com'].includes(domain) ||
    /(^|[^a-z])test([^a-z]|$)/.test(email.split('@')[0] || '') ||
    /(^|[^a-z])test([^a-z]|$)/.test(name)
  )
}

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

    private readonly marketing: MarketingService,
  ) {}

  async list(repo: AnyRepo, tenantId: string, status?: string) {
    const where: any = { tenantId }
    if (status) where.status = status
    const rows = await repo.find({ where, order: { createdAt: 'DESC' } })
    const now = Date.now()
    return rows.map((r: any) => ({
      ...r,
      isTest: looksLikeTest(r),
      overdue:
        String(r.status || 'new').toLowerCase() === 'new' &&
        !!r.createdAt &&
        now - new Date(r.createdAt).getTime() > OVERDUE_MS,
    }))
  }

  // Every inbound request reaches the team's mailbox, not just the inbox.
  async notifyTeam(kind: string, row: any) {
    const fields = Object.entries(row || {})
      .filter(([k, v]) => v != null && v !== '' && !['id', 'tenantId', 'createdAt', 'updatedAt', 'status'].includes(k) && typeof v !== 'object')
      .map(([k, v]) => `<tr><td style="color:#6b7280;padding:2px 8px 2px 0">${esc(k)}</td><td>${esc(v).replace(/\n/g, '<br>')}</td></tr>`)
      .join('')
    await this.email
      .sendMail(NOTIFY_TO(), `New ${kind} — Rangani website`, `<p>A new ${esc(kind)} was submitted on the website.</p><table>${fields}</table>`)
      .catch(() => undefined)
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
      marketing: MarketingService.sanitize(dto.marketing),
    } as any)
    const saved = await this.appointments.save(row as any)
    void this.marketing.sendFormEvent('Schedule', (saved as any).marketing, { email: dto.email, phone: dto.phone })

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

  async create(repo: AnyRepo, tenantId: string, dto: any) {
    const row = repo.create({ ...dto, marketing: MarketingService.sanitize(dto.marketing), tenantId, status: dto.status || 'new' })
    const saved = await repo.save(row)
    void this.marketing.sendFormEvent('Lead', (saved as any).marketing, { email: (dto as any).email, phone: (dto as any).phone }, { content_name: repo === this.customRequests ? 'custom_design' : 'resize_repair' })
    if (repo === this.customRequests) await this.notifyTeam('custom design request', saved)
    else if (repo === this.resizeRepairs) await this.notifyTeam('resize / repair request', saved)
    return saved
  }

  // Contact form submissions were only ever written to the DB with no admin
  // inbox screen to read them from and no notification of any kind — a
  // message effectively vanished the moment it was sent. Now emails
  // contact@/info@ranganijewelry.com (override via CONTACT_NOTIFY_EMAIL) plus
  // a short acknowledgement back to the sender, mirroring bookAppointment()'s
  // pattern above. Never blocks the save if email delivery fails.
  async createContact(tenantId: string, dto: any) {
    const row = this.contacts.create({ ...dto, marketing: MarketingService.sanitize(dto.marketing), tenantId, status: dto.status || 'new' })
    const saved = await this.contacts.save(row)
    void this.marketing.sendFormEvent('Lead', (saved as any).marketing, { email: dto.email, phone: dto.phone }, { content_name: 'contact' })

    const notifyTo = NOTIFY_TO()
    await this.email.sendMail(
      notifyTo,
      `New contact form message — ${dto.subject || 'General Enquiry'}`,
      `<p><b>${esc(dto.name || 'A visitor')}</b> sent a message via the website contact form.</p>` +
        `<p>Email: ${esc(dto.email || '—')}<br>Phone: ${esc(dto.phone || '—')}</p>` +
        `<p>Subject: ${esc(dto.subject || 'General Enquiry')}</p>` +
        `<p>Message:<br>${esc(dto.message || '').replace(/\n/g, '<br>')}</p>`,
    )

    if (dto.email) {
      await this.email.sendMail(
        dto.email,
        "We've received your message — Rangani Jewelry House",
        `<p>Dear ${esc(dto.name || '')},</p>` +
          `<p>Thank you for reaching out — we've received your message and will get back to you shortly.</p>` +
          `<p>— Rangani Jewelry House</p>`,
      )
    }

    return saved
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
