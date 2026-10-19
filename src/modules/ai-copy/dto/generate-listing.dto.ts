import { IsArray, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class MetalOptionDto {
  @IsOptional()
  @IsString()
  type?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  purities?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[]
}

export class GenerateListingDto {
  @IsOptional()
  @IsString()
  productName?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsString()
  subCategory?: string

  @IsOptional()
  @IsString()
  collectionName?: string

  @IsOptional()
  @IsString()
  occasion?: string

  @IsOptional()
  @IsString()
  gender?: string

  // Full metal option set (one entry per metal type the product is sold in),
  // each carrying EVERY selectable purity/color — not just the first one —
  // so the prompt can tell a genuinely variable attribute (write a {{token}})
  // from a fixed single value (write it literally).
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetalOptionDto)
  metalOptions?: MetalOptionDto[]

  @IsOptional()
  @IsString()
  diamondShape?: string

  @IsOptional()
  @IsString()
  diamondQuality?: string

  @IsOptional()
  @IsString()
  diamondColor?: string

  @IsOptional()
  @IsString()
  diamondClarity?: string

  @IsOptional()
  @IsString()
  diamondCut?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  diamondCount?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  diamondWeightCt?: number

  // Every carat option the configurator offers (from the product's carat→
  // weight matrix) — when this has 2+ entries, the diamond weight is a
  // genuinely shopper-selectable attribute, same as metalOptions above, so
  // the prompt should write {{diamond_weight}} instead of one fixed number.
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  diamondWeightOptions?: number[]

  @IsOptional()
  @IsString()
  centerStoneShape?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  centerStoneWeightCt?: number

  @IsOptional()
  @IsString()
  style?: string

  @IsOptional()
  @IsString()
  brand?: string

  @IsOptional()
  @IsIn(['haiku', 'sonnet'])
  model?: 'haiku' | 'sonnet'
}
