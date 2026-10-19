import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { SubmissionsService } from './submissions.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'

@ApiTags('storefront-submissions')
@Controller('storefront')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly service: SubmissionsService) {}

  // ─── Custom Design Requests ──────────────────────────────────────────────

  @Public()
  @Post('custom-requests')
  @ApiOperation({ summary: 'Submit a custom design request (public)' })
  createCustomRequest(
    @Headers('x-tenant-id') headerTenantId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: any,
  ) {
    return this.service.create(this.service.customRequests, tenantId || headerTenantId, dto)
  }

  @Get('custom-requests')
  @Roles('admin', 'manager', 'staff')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List custom design requests (admin)' })
  listCustomRequests(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('status') status?: string,
  ) {
    return this.service.list(this.service.customRequests, tenantId || headerTenantId, status)
  }

  @Get('custom-requests/:id')
  @Roles('admin', 'manager', 'staff')
  @ApiBearerAuth()
  getCustomRequest(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.get(this.service.customRequests, tenantId || headerTenantId, id)
  }

  @Put('custom-requests/:id')
  @Roles('admin', 'manager')
  @ApiBearerAuth()
  updateCustomRequest(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.service.update(this.service.customRequests, tenantId || headerTenantId, id, dto)
  }

  @Delete('custom-requests/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCustomRequest(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(this.service.customRequests, tenantId || headerTenantId, id)
  }

  // ─── Resize / Repair Requests ────────────────────────────────────────────

  @Public()
  @Post('resize-repair-requests')
  @ApiOperation({ summary: 'Submit a resize/repair request (public)' })
  createResizeRepair(
    @Headers('x-tenant-id') headerTenantId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: any,
  ) {
    return this.service.create(this.service.resizeRepairs, tenantId || headerTenantId, dto)
  }

  @Get('resize-repair-requests')
  @Roles('admin', 'manager', 'staff')
  @ApiBearerAuth()
  listResizeRepair(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('status') status?: string,
  ) {
    return this.service.list(this.service.resizeRepairs, tenantId || headerTenantId, status)
  }

  @Get('resize-repair-requests/:id')
  @Roles('admin', 'manager', 'staff')
  @ApiBearerAuth()
  getResizeRepair(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.get(this.service.resizeRepairs, tenantId || headerTenantId, id)
  }

  @Put('resize-repair-requests/:id')
  @Roles('admin', 'manager')
  @ApiBearerAuth()
  updateResizeRepair(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.service.update(this.service.resizeRepairs, tenantId || headerTenantId, id, dto)
  }

  @Delete('resize-repair-requests/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  removeResizeRepair(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(this.service.resizeRepairs, tenantId || headerTenantId, id)
  }

  // ─── Appointments ────────────────────────────────────────────────────────

  @Public()
  @Get('appointments/slots')
  @ApiOperation({ summary: '30-min consultation slots for a date (public)' })
  appointmentSlots(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('date') date: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.service.appointmentSlots(tenantId || headerTenantId, date)
  }

  @Public()
  @Post('appointments')
  @ApiOperation({ summary: 'Book an appointment (public)' })
  createAppointment(
    @Headers('x-tenant-id') headerTenantId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: any,
  ) {
    return this.service.bookAppointment(tenantId || headerTenantId, dto)
  }

  @Get('appointments')
  @Roles('admin', 'manager', 'staff')
  @ApiBearerAuth()
  listAppointments(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('status') status?: string,
  ) {
    return this.service.list(this.service.appointments, tenantId || headerTenantId, status)
  }

  @Get('appointments/:id')
  @Roles('admin', 'manager', 'staff')
  @ApiBearerAuth()
  getAppointment(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.get(this.service.appointments, tenantId || headerTenantId, id)
  }

  @Put('appointments/:id')
  @Roles('admin', 'manager', 'staff')
  @ApiBearerAuth()
  updateAppointment(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.service.update(this.service.appointments, tenantId || headerTenantId, id, dto)
  }

  @Delete('appointments/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAppointment(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(this.service.appointments, tenantId || headerTenantId, id)
  }

  // ─── Contact Submissions ─────────────────────────────────────────────────

  @Public()
  @Post('contact-submissions')
  @ApiOperation({ summary: 'Submit a contact form (public)' })
  createContact(
    @Headers('x-tenant-id') headerTenantId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: any,
  ) {
    return this.service.createContact(tenantId || headerTenantId, dto)
  }

  @Get('contact-submissions')
  @Roles('admin', 'manager', 'staff')
  @ApiBearerAuth()
  listContacts(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('status') status?: string,
  ) {
    return this.service.list(this.service.contacts, tenantId || headerTenantId, status)
  }

  @Get('contact-submissions/:id')
  @Roles('admin', 'manager', 'staff')
  @ApiBearerAuth()
  getContact(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.get(this.service.contacts, tenantId || headerTenantId, id)
  }

  @Put('contact-submissions/:id')
  @Roles('admin', 'manager', 'staff')
  @ApiBearerAuth()
  updateContact(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.service.update(this.service.contacts, tenantId || headerTenantId, id, dto)
  }

  @Delete('contact-submissions/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  removeContact(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(this.service.contacts, tenantId || headerTenantId, id)
  }
}
