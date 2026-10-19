import { IsOptional, IsString, IsNumber } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { PaginationDto } from '../../../common/dto/pagination.dto'

export class DesignFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metalType?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metalColor?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diamondShape?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string

  @ApiPropertyOptional({ description: 'Filter by gross weight minimum (grams)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minWeight?: number

  @ApiPropertyOptional({ description: 'Filter by gross weight maximum (grams)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxWeight?: number
}
