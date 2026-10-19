import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001'

// Lets the cart/checkout endpoints serve BOTH logged-in customers (real JWT)
// and anonymous shoppers (a client-generated `x-guest-id` UUID, persisted in
// their browser) — guest checkout needs the cart to work before login exists.
@Injectable()
export class CartAccessGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (user) return user

    const request = context.switchToHttp().getRequest()
    const guestId = request.headers['x-guest-id']
    if (typeof guestId === 'string' && GUID_RE.test(guestId)) {
      return {
        id: guestId,
        tenantId: (request.headers['x-tenant-id'] as string) || DEFAULT_TENANT,
        isGuest: true,
      }
    }

    throw err || new UnauthorizedException('Login required, or missing guest session')
  }
}
