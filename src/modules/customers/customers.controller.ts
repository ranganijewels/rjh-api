import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  UseGuards,
  Version,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger'
import { CustomersService } from './customers.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { PaginationDto } from '../../common/dto/pagination.dto'

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // ─── Customers ───────────────────────────────────────────────────────────

  @Get()
  @Roles('staff')
  @ApiOperation({ summary: 'List ERP customers (paginated)' })
  getCustomers(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.customersService.getCustomers(tenantId, dto)
  }

  @Post()
  @Roles('staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new customer' })
  createCustomer(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.customersService.createCustomer(tenantId, dto, userId)
  }

  @Get('search')
  @Roles('staff')
  @ApiOperation({ summary: 'Search customers by name, phone, or email' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query (min 2 chars)' })
  searchCustomers(
    @Headers('x-tenant-id') tenantId: string,
    @Query('q') q: string,
  ) {
    return this.customersService.searchCustomers(tenantId, q)
  }

  @Get(':id')
  @Roles('staff')
  @ApiOperation({ summary: 'Get a single customer with addresses' })
  getCustomer(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.getCustomer(tenantId, id)
  }

  @Patch(':id')
  @Roles('staff')
  @ApiOperation({ summary: 'Update a customer' })
  updateCustomer(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.customersService.updateCustomer(tenantId, id, dto, userId)
  }

  // ─── Addresses ───────────────────────────────────────────────────────────

  @Get(':id/addresses')
  @Roles('staff')
  @ApiOperation({ summary: 'Get all addresses for a customer' })
  getAddresses(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.getAddresses(tenantId, id)
  }

  @Post(':id/addresses')
  @Roles('staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an address to a customer' })
  addAddress(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') customerId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.customersService.addAddress(tenantId, customerId, dto)
  }

  @Patch('addresses/:addressId')
  @Roles('staff')
  @ApiOperation({ summary: 'Update a customer address' })
  updateAddress(
    @Headers('x-tenant-id') tenantId: string,
    @Param('addressId') addressId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.customersService.updateAddress(tenantId, addressId, dto)
  }

  @Delete('addresses/:addressId')
  @Roles('staff')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a customer address' })
  deleteAddress(
    @Headers('x-tenant-id') tenantId: string,
    @Param('addressId') addressId: string,
  ) {
    return this.customersService.deleteAddress(tenantId, addressId)
  }
}
