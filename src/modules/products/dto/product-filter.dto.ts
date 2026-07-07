import { IsOptional, IsString, IsNumber } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { PaginationDto } from '../../../common/dto/pagination.dto'

export class ProductFilterDto extends PaginationDto {
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

  @ApiPropertyOptional({ description: 'Filter to variants of this parent product ID' })
  @IsOptional()
  @IsString()
  parentProductId?: string

  @ApiPropertyOptional({ description: 'Filter by variant type: shape, color' })
  @IsOptional()
  @IsString()
  variantType?: string

  @ApiPropertyOptional({ description: 'Filter by variant value: RND, YELLOW, etc.' })
  @IsOptional()
  @IsString()
  variantValue?: string

  @ApiPropertyOptional({ description: 'Minimum MRP / price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number

  @ApiPropertyOptional({ description: 'Maximum MRP / price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number
}
