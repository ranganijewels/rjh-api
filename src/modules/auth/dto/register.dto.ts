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
    example: 'staff',
    enum: ['admin', 'manager', 'staff', 'viewer', 'customer'],
    default: 'staff',
  })
  @IsOptional()
  @IsIn(['admin', 'manager', 'staff', 'viewer', 'customer'])
  role?: string = 'staff'

  @ApiPropertyOptional({ example: 'uuid-tenant-id' })
  @IsOptional()
  @IsUUID()
  tenantId?: string
}
