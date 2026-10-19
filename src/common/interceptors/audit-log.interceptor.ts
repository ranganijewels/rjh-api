import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { AuditService } from '../../modules/audit/audit.service'

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const method = request.method

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle()
    }

    const user = request.user
    const tenantId = request.headers?.['x-tenant-id'] || user?.tenantId
    const url: string = request.url || ''

    const urlParts = url.replace(/\/api\/v\d+\//, '').split('/')
    const entityType = urlParts[0] || 'unknown'
    const entityId = urlParts[1] && /^[0-9a-f-]{36}$/.test(urlParts[1]) ? urlParts[1] : undefined

    const actionMap: Record<string, string> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    }

    return next.handle().pipe(
      tap(async (data) => {
        if (!user?.id || !tenantId) return
        try {
          const resolvedEntityId = entityId || data?.data?.id || data?.id
          await this.auditService.log({
            tenantId,
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            action: actionMap[method] || method,
            entityType,
            entityId: resolvedEntityId,
            newData: data?.data ?? data,
            ipAddress: request.ip,
            userAgent: request.headers?.['user-agent'],
          })
        } catch {
          // Audit log failures must never break the main request
        }
      }),
    )
  }
}
