import { IsString, IsOptional, IsNumber } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CreateDesignDto {
  @ApiProperty({ description: 'Design display name' })
  @IsString()
  designName: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designCode?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

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
  metalPurity?: string

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
  @Type(() => Number)
  @IsNumber()
  grossWeightG?: number

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  netWeightG?: number

  @ApiPropertyOptional({ default: 'active' })
  @IsOptional()
  @IsString()
  status?: string
}
