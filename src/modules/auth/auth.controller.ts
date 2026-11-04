import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Version,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Request } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── POST /auth/login ────────────────────────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 200, description: 'Returns access token, refresh token, and user info' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or account locked' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<{ accessToken: string; refreshToken: string; user: Record<string, any> }> {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip
    const userAgent = req.headers['user-agent']
    return this.authService.login(dto, ip, userAgent)
  }

  // ─── POST /auth/register ─────────────────────────────────────────────────

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 403, description: 'Staff roles require an admin token' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ): Promise<{ message: string; user: Record<string, any> }> {
    const result = await this.authService.register(dto, req.headers.authorization)
    return { message: 'User registered', user: result.user }
  }

  // ─── POST /auth/forgot-password ──────────────────────────────────────────

  // Behind nginx every caller shares one IP, so this route limit only stops
  // floods; the per-email limit lives in AuthService.requestPasswordReset.
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email a one-time password reset link' })
  @ApiResponse({ status: 200, description: 'Same response whether or not the email has an account' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.requestPasswordReset(dto.email)
    return { message: 'If an account exists for that email, a reset link is on its way.' }
  }

  // ─── POST /auth/reset-password ───────────────────────────────────────────

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a new password from a reset link' })
  @ApiResponse({ status: 200, description: 'Password changed; existing sessions are signed out' })
  @ApiResponse({ status: 400, description: 'Link invalid, used or expired' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(dto.token, dto.newPassword)
    return { message: 'Password updated. You can log in with your new password.' }
  }

  // ─── POST /auth/refresh ──────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  @ApiResponse({ status: 200, description: 'New access and refresh tokens issued' })
  @ApiResponse({ status: 401, description: 'Invalid, expired, or reused refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip
    const userAgent = req.headers['user-agent']
    return this.authService.refreshTokens(dto.refreshToken, ip, userAgent)
  }

  // ─── POST /auth/logout ───────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current refresh token (logout)' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @CurrentUser('id') userId: string,
    @Body() dto: RefreshTokenDto,
  ): Promise<{ message: string }> {
    await this.authService.logout(userId, dto.refreshToken)
    return { message: 'Logged out successfully' }
  }

  // ─── GET /auth/me ────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns the authenticated user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(@CurrentUser() user: Record<string, any>): Promise<Record<string, any>> {
    return this.authService.getMe(user.id)
  }

  // ─── PATCH /auth/me ──────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Returns the updated user profile' })
  async updateMe(
    @CurrentUser() user: Record<string, any>,
    @Body() dto: { fullName?: string; phone?: string; birthDate?: string | null },
  ): Promise<Record<string, any>> {
    return this.authService.updateMe(user.id, dto)
  }
}
