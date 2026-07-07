import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Version,
} from '@nestjs/common'
import { UsersService } from './users.service'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../../database/entities/user.entity'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin', 'super_admin')
  getUsers(
    @CurrentUser() user: User,
    @Query() dto: PaginationDto & { role?: string },
  ) {
    return this.usersService.getUsers(user.tenantId, dto)
  }

  @Get('me/password')
  // Placeholder — password change is via PATCH below; this route kept for symmetry
  getPasswordInfo() {
    return { message: 'Use PATCH /users/me/password to change password' }
  }

  @Get(':id')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id)
  }

  @Patch('me/password')
  changePassword(
    @CurrentUser() user: User,
    @Body() dto: { currentPassword: string; newPassword: string },
  ) {
    return this.usersService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    )
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  updateUser(
    @CurrentUser() requestingUser: User,
    @Param('id') id: string,
    @Body()
    dto: {
      fullName?: string
      role?: string
      isActive?: boolean
      phone?: string
      avatar?: string
    },
  ) {
    return this.usersService.updateUser(
      requestingUser.tenantId,
      id,
      dto,
      requestingUser,
    )
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  deleteUser(@CurrentUser() requestingUser: User, @Param('id') id: string) {
    return this.usersService.deleteUser(requestingUser.tenantId, id, requestingUser)
  }
}
