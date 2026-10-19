import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { User } from '../../database/entities/user.entity'
import { Tenant } from '../../database/entities/tenant.entity'
import { PaginationDto } from '../../common/dto/pagination.dto'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } })
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`)
    }
    return user
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } }) ?? null
  }

  async getUsers(
    tenantId: string,
    dto: PaginationDto & { role?: string },
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, role } = dto
    const skip = (page - 1) * limit

    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.tenantId = :tenantId', { tenantId })

    if (role) {
      qb.andWhere('user.role = :role', { role })
    }

    qb.skip(skip).take(limit).orderBy('user.createdAt', 'DESC')

    const [data, total] = await qb.getManyAndCount()
    return { data, total, page, limit }
  }

  async updateUser(
    tenantId: string,
    id: string,
    dto: {
      fullName?: string
      role?: string
      isActive?: boolean
      phone?: string
      avatar?: string
    },
    requestingUser: User,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, tenantId },
    })
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`)
    }

    // Role change restrictions
    if (dto.role !== undefined) {
      const adminRoles = ['admin', 'super_admin']
      const requestingIsAdmin = adminRoles.includes(requestingUser.role)

      if (!requestingIsAdmin) {
        throw new ForbiddenException('Only admins can change user roles')
      }

      // Cannot change super_admin role unless requester is super_admin
      if (
        user.role === 'super_admin' &&
        requestingUser.role !== 'super_admin'
      ) {
        throw new ForbiddenException(
          'Only super admins can modify super admin users',
        )
      }

      // Cannot assign super_admin role unless requester is super_admin
      if (
        dto.role === 'super_admin' &&
        requestingUser.role !== 'super_admin'
      ) {
        throw new ForbiddenException(
          'Only super admins can assign the super admin role',
        )
      }
    }

    Object.assign(user, dto)
    return this.userRepository.save(user)
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'passwordHash'],
    })
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`)
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect')
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await this.userRepository.update(userId, { passwordHash: hashed })
  }

  async deleteUser(
    tenantId: string,
    id: string,
    requestingUser: User,
  ): Promise<void> {
    if (requestingUser.id === id) {
      throw new ForbiddenException('You cannot delete your own account')
    }

    const user = await this.userRepository.findOne({
      where: { id, tenantId },
    })
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`)
    }

    // Soft delete
    await this.userRepository.update(id, { isActive: false })
  }
}
