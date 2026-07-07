import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt'

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'desc'

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string

  skip?: number
}

export function getSkip(dto: PaginationDto): number {
  return ((dto.page || 1) - 1) * (dto.limit || 20)
}

export function paginate<T>(data: T[], total: number, dto: PaginationDto) {
  return {
    data,
    meta: {
      page: dto.page || 1,
      limit: dto.limit || 20,
      total,
      totalPages: Math.ceil(total / (dto.limit || 20)),
    },
  }
}
