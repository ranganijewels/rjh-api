import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { User } from '../../database/entities/user.entity'
import { RefreshToken } from '../../database/entities/refresh-token.entity'
import { PasswordResetToken } from '../../database/entities/password-reset-token.entity'
import { EmailService } from '../../infrastructure/email/email.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

interface TokenPair {
  accessToken: string
  refreshToken: string
}

interface AuthResponse extends TokenPair {
  user: Omit<User, 'passwordHash'>
}

const LOCKOUT_MAX = 5
const LOCKOUT_TTL = 15 * 60

// Password reset: links live 30 minutes; at most 3 emails per address per 15 minutes.
const RESET_TTL_MINUTES = 30
const RESET_MAX_PER_WINDOW = 3
const RESET_WINDOW = 15 * 60

const esc = (v: any) =>
  String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly rtRepo: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private readonly resetRepo: Repository<PasswordResetToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly email: EmailService,
  ) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string): Promise<AuthResponse> {
    const lockKey = `auth:lock:${dto.email}`
    const attempts = await this.cache.get<number>(lockKey)
    if (attempts >= LOCKOUT_MAX) {
      throw new UnauthorizedException('Account locked. Try again in 15 minutes.')
    }

    const user = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase(), isActive: true } })
    if (!user) {
      await this.cache.set(lockKey, (attempts ?? 0) + 1, LOCKOUT_TTL * 1000)
      throw new UnauthorizedException('Invalid credentials')
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) {
      await this.cache.set(lockKey, (attempts ?? 0) + 1, LOCKOUT_TTL * 1000)
      throw new UnauthorizedException('Invalid credentials')
    }

    await this.cache.del(lockKey)
    const tokens = await this.generateTokenPair(user, undefined, ip, userAgent)
    const { passwordHash: _p, ...safeUser } = user as any
    return { ...tokens, user: safeUser }
  }

  async register(dto: RegisterDto, authHeader?: string): Promise<{ user: Partial<User> }> {
    // The route is public so storefront shoppers can sign up. Anything above
    // `customer` is a staff account and may only be created by a signed-in admin
    // (the admin panel's user-management form forwards its token).
    const role = dto.role ?? 'customer'
    if (role !== 'customer') await this.assertAdminCaller(authHeader)

    const existing = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase() } })
    if (existing) throw new ConflictException('Email already in use')

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const tenantId = dto.tenantId ?? this.configService.get<string>('defaultTenantId')

    const user = await this.userRepo.save(
      this.userRepo.create({
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
        role: role as any,
        tenantId,
        isActive: true,
      }),
    )

    const { passwordHash: _p, ...safeUser } = user as any
    return { user: safeUser }
  }
  private async assertAdminCaller(authHeader?: string): Promise<void> {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
    if (!token) throw new ForbiddenException('Only admins can create staff accounts')

    let payload: { sub?: string }
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret:
          this.configService.get('jwt.publicKey') ||
          this.configService.get('jwt.privateKey') ||
          'fallback-secret',
        algorithms: ['RS256', 'HS256'],
      })
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }

    const caller = await this.userRepo.findOne({ where: { id: payload.sub, isActive: true } })
    if (!caller || !['admin', 'super_admin'].includes(caller.role)) {
      throw new ForbiddenException('Only admins can create staff accounts')
    }
  }


  async refreshTokens(rawToken: string, ip?: string, userAgent?: string): Promise<TokenPair> {
    const tokenHash = this.hash(rawToken)
    const stored = await this.rtRepo.findOne({ where: { tokenHash }, relations: ['user'] })

    if (!stored) throw new UnauthorizedException('Invalid refresh token')

    if (stored.revoked) {
      if (stored.tokenFamily) {
        await this.rtRepo.update({ tokenFamily: stored.tokenFamily, revoked: false }, { revoked: true })
      }
      throw new UnauthorizedException('Token reuse detected. Please log in again.')
    }

    if (stored.expiresAt < new Date()) {
      await this.rtRepo.update(stored.id, { revoked: true })
      throw new UnauthorizedException('Refresh token expired')
    }

    if (!stored.user?.isActive) throw new UnauthorizedException('User inactive')

    await this.rtRepo.update(stored.id, { revoked: true, revokedAt: new Date() })
    return this.generateTokenPair(stored.user, stored.tokenFamily, ip, userAgent)
  }

  async logout(userId: string, rawToken: string): Promise<void> {
    const tokenHash = this.hash(rawToken)
    const stored = await this.rtRepo.findOne({ where: { tokenHash, userId } })
    if (stored) await this.rtRepo.update(stored.id, { revoked: true, revokedAt: new Date() })
  }

  async getMe(userId: string): Promise<Partial<User>> {
    const user = await this.userRepo.findOne({ where: { id: userId, isActive: true } })
    if (!user) throw new NotFoundException('User not found')
    const { passwordHash: _p, ...safe } = user as any
    return safe
  }

  async updateMe(
    userId: string,
    dto: { fullName?: string; phone?: string; birthDate?: string | null },
  ): Promise<Partial<User>> {
    const user = await this.userRepo.findOne({ where: { id: userId, isActive: true } })
    if (!user) throw new NotFoundException('User not found')

    if (dto.fullName !== undefined) user.fullName = dto.fullName
    if (dto.phone !== undefined) user.phone = dto.phone
    if (dto.birthDate !== undefined) user.birthDate = dto.birthDate || null

    await this.userRepo.save(user)
    const { passwordHash: _p, ...safe } = user as any
    return safe
  }

  private async generateTokenPair(user: User, family?: string, ip?: string, userAgent?: string): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(user)
    const raw = crypto.randomBytes(64).toString('hex')
    const tokenHash = this.hash(raw)
    const tokenFamily = family ?? crypto.randomUUID()
    const expiresAt = this.parseExpiry(this.configService.get<string>('jwt.refreshExpires', '7d'))

    await this.rtRepo.save(
      this.rtRepo.create({ tokenHash, userId: user.id, tokenFamily, expiresAt, revoked: false, ipAddress: ip, userAgent }),
    )

    return { accessToken, refreshToken: raw }
  }

  private generateAccessToken(user: User): string {
    const payload = { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId }
    const privateKey = this.configService.get<string>('jwt.privateKey')
    const expiresIn = this.configService.get<string>('jwt.accessExpires', '15m')

    if (privateKey) {
      return this.jwtService.sign(payload, { algorithm: 'RS256', expiresIn, privateKey })
    }
    return this.jwtService.sign(payload, { algorithm: 'HS256', expiresIn })
  }

  // ─── Password reset ──────────────────────────────────────────────────────

  /**
   * Emails a one-time reset link when the address belongs to an active
   * account. Always resolves the same way so the endpoint cannot be used to
   * find out which emails are registered.
   */
  async requestPasswordReset(rawEmail: string): Promise<void> {
    const email = rawEmail.trim().toLowerCase()
    const rateKey = `auth:reset:${email}`
    const sent = (await this.cache.get<number>(rateKey)) ?? 0
    if (sent >= RESET_MAX_PER_WINDOW) return

    const user = await this.userRepo.findOne({ where: { email, isActive: true } })
    if (!user) return
    await this.cache.set(rateKey, sent + 1, RESET_WINDOW * 1000)

    // Only the newest link works.
    await this.resetRepo.delete({ userId: user.id })
    const raw = crypto.randomBytes(32).toString('hex')
    await this.resetRepo.save(
      this.resetRepo.create({
        userId: user.id,
        tokenHash: this.hash(raw),
        expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
      }),
    )

    const base = (this.configService.get<string>('STOREFRONT_URL') || 'http://localhost:3000').replace(/\/$/, '')
    const link = `${base}/reset-password?token=${raw}`
    const name = user.fullName?.split(' ')[0] || 'there'
    await this.email.sendMail(
      user.email,
      'Reset your Rangani Jewelry House password',
      `<p>Hi ${esc(name)},</p>` +
        `<p>We received a request to reset your password. Use the link below to choose a new one. ` +
        `It works once and expires in ${RESET_TTL_MINUTES} minutes.</p>` +
        `<p><a href="${link}">Reset your password</a></p>` +
        `<p>If you didn't ask for this, you can ignore this email; your password stays the same.</p>`,
    )
  }

  /** Sets a new password from a valid reset link, then signs the account out everywhere. */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const record = await this.resetRepo.findOne({ where: { tokenHash: this.hash(rawToken) } })
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('This reset link is invalid or has expired. Request a new one.')
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await this.userRepo.update(record.userId, { passwordHash, failedLoginAttempts: 0, lockedUntil: null })
    await this.resetRepo.update(record.id, { usedAt: new Date() })
    await this.rtRepo.update({ userId: record.userId, revoked: false }, { revoked: true, revokedAt: new Date() })

    const user = await this.userRepo.findOne({ where: { id: record.userId } })
    if (user) await this.cache.del(`auth:lock:${user.email}`)
  }

  private hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  private parseExpiry(exp: string): Date {
    const d = new Date()
    const unit = exp.slice(-1)
    const val = parseInt(exp.slice(0, -1), 10)
    if (unit === 'd') d.setDate(d.getDate() + val)
    else if (unit === 'h') d.setHours(d.getHours() + val)
    else if (unit === 'm') d.setMinutes(d.getMinutes() + val)
    else d.setSeconds(d.getSeconds() + parseInt(exp, 10))
    return d
  }
}
