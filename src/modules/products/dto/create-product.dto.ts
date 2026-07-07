import { IsString, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type, Transform } from 'class-transformer'

export class CreateProductDto {
  @ApiProperty({ description: 'Product display name' })
  @IsString()
  productName: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productCode?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopifySku?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collectionName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  longDescription?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subCategory?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metalType?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metalPurity?: string

  // ERP sends gold_purity → goldPurity after camelCase conversion; alias to metalPurity
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  goldPurity?: string

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
  diamondQuality?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diamondCut?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diamondColor?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diamondClarity?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diamondCertLab?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diamondCertNumber?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diamondCertUrl?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diamondType?: string

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  diamondCount?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  centerStoneShape?: string

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  centerStoneWeightCt?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sideStoneDetails?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ringSize?: string

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

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  diamondWeightCt?: number

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lengthMm?: number

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  widthMm?: number

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  heightMm?: number

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  makingCharge?: number

  // mrp / shopifyPrice intentionally removed — products do not store prices.

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mainImageUrl?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  renderFileUrl?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cadFileUrl?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoUrl?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoTitle?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoDescription?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopifyTags?: string

  @ApiPropertyOptional({ default: 'active' })
  @IsOptional()
  @IsString()
  status?: string

  // ERP sends product_status → productStatus after camelCase conversion
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productStatus?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isReadyForQc?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isReadyForShopify?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  aiMissingFields?: string[]

  // Variant support: a product can be a child of a parent design.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentProductId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantType?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantValue?: string

  // Free-form JSONB for design-master extras: occasion, brand, designer,
  // gender, titleLine, remarks, and the material sub-table (materials[]).
  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>
}
