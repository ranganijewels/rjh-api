import { IsEmail, IsString, IsOptional, IsIn, IsUUID, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RegisterDto {
  @ApiProperty({ example: 'user@rjhouse.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  fullName: string

  @ApiPropertyOptional({
    example: 'customer',
    enum: ['admin', 'manager', 'staff', 'viewer', 'customer'],
    default: 'customer',
    description: 'Roles other than customer require an admin bearer token',
  })
  @IsOptional()
  @IsIn(['admin', 'manager', 'staff', 'viewer', 'customer'])
  role?: string = 'customer'

  @ApiPropertyOptional({ example: 'uuid-tenant-id' })
  @IsOptional()
  @IsUUID()
  tenantId?: string
}
