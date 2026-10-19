import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../../../database/entities/user.entity'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get('jwt.publicKey') ||
        configService.get('jwt.privateKey') ||
        'fallback-secret',
      algorithms: ['RS256', 'HS256'],
    })
  }

  async validate(payload: any) {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub, isActive: true },
    })
    if (!user) throw new UnauthorizedException('User not found or inactive')
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    }
  }
}
