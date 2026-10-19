import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly rtRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
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

  async register(dto: RegisterDto): Promise<{ user: Partial<User> }> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase() } })
    if (existing) throw new ConflictException('Email already in use')

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const tenantId = dto.tenantId ?? this.configService.get<string>('defaultTenantId')

    const user = await this.userRepo.save(
      this.userRepo.create({
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
        role: (dto.role as any) ?? 'staff',
        tenantId,
        isActive: true,
      }),
    )

    const { passwordHash: _p, ...safeUser } = user as any
    return { user: safeUser }
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
