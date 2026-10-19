import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredRoles || requiredRoles.length === 0) return true

    const { user } = context.switchToHttp().getRequest()
    if (!user) throw new ForbiddenException('Access denied')

    const roleHierarchy: Record<UserRole, number> = {
      super_admin: 5,
      admin: 4,
      manager: 3,
      staff: 2,
      viewer: 1,
    }

    const userLevel = roleHierarchy[user.role as UserRole] || 0
    const minRequired = Math.min(...requiredRoles.map((r) => roleHierarchy[r] || 0))

    if (userLevel < minRequired) {
      throw new ForbiddenException(`Requires one of: ${requiredRoles.join(', ')}`)
    }
    return true
  }
}
