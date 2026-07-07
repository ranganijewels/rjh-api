import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CatalogMaster } from '../../database/entities/catalog-master.entity'

const TENANT = '00000000-0000-0000-0000-000000000001'

type Seed = { kind: string; code: string; name: string; sortOrder?: number; seoSlug?: string; synonyms?: string[]; metadata?: Record<string, any> }

const SEEDS: Seed[] = [
  // Diamond shapes
  { kind: 'diamond_shape', code: 'RND', name: 'Round Brilliant', sortOrder: 1, seoSlug: 'round', synonyms: ['Round Cut', 'Brilliant'] },
  { kind: 'diamond_shape', code: 'OVL', name: 'Oval', sortOrder: 2, seoSlug: 'oval', synonyms: ['Oval Cut'] },
  { kind: 'diamond_shape', code: 'PRI', name: 'Princess', sortOrder: 3, seoSlug: 'princess', synonyms: ['Princess Cut'] },
  { kind: 'diamond_shape', code: 'EMR', name: 'Emerald', sortOrder: 4, seoSlug: 'emerald', synonyms: ['Emerald Cut'] },
  { kind: 'diamond_shape', code: 'CUS', name: 'Cushion', sortOrder: 5, seoSlug: 'cushion', synonyms: ['Cushion Cut'] },
  { kind: 'diamond_shape', code: 'PEA', name: 'Pear', sortOrder: 6, seoSlug: 'pear', synonyms: ['Pear Cut', 'Teardrop'] },
  { kind: 'diamond_shape', code: 'MAR', name: 'Marquise', sortOrder: 7, seoSlug: 'marquise', synonyms: ['Marquise Cut'] },
  { kind: 'diamond_shape', code: 'RAD', name: 'Radiant', sortOrder: 8, seoSlug: 'radiant', synonyms: ['Radiant Cut'] },
  { kind: 'diamond_shape', code: 'ASC', name: 'Asscher', sortOrder: 9, seoSlug: 'asscher', synonyms: ['Asscher Cut'] },
  { kind: 'diamond_shape', code: 'HRT', name: 'Heart', sortOrder: 10, seoSlug: 'heart', synonyms: ['Heart Cut'] },
  // Metal types
  { kind: 'metal_type', code: 'GOLD', name: 'Gold', sortOrder: 1 },
  { kind: 'metal_type', code: 'SILVER', name: 'Silver', sortOrder: 2 },
  { kind: 'metal_type', code: 'PLATINUM', name: 'Platinum', sortOrder: 3 },
  // Metal purities (metadata.applicableMetals drives the configurator)
  { kind: 'metal_purity', code: '24K', name: '24K', sortOrder: 1, metadata: { applicableMetals: ['GOLD'] } },
  { kind: 'metal_purity', code: '22K', name: '22K', sortOrder: 2, metadata: { applicableMetals: ['GOLD'] } },
  { kind: 'metal_purity', code: '18K', name: '18K', sortOrder: 3, metadata: { applicableMetals: ['GOLD'] } },
  { kind: 'metal_purity', code: '14K', name: '14K', sortOrder: 4, metadata: { applicableMetals: ['GOLD'] } },
  { kind: 'metal_purity', code: '999', name: '999 (Fine Silver)', sortOrder: 5, metadata: { applicableMetals: ['SILVER'] } },
  { kind: 'metal_purity', code: '925', name: '925 (Sterling)', sortOrder: 6, metadata: { applicableMetals: ['SILVER'] } },
  { kind: 'metal_purity', code: '800', name: '800', sortOrder: 7, metadata: { applicableMetals: ['SILVER'] } },
  { kind: 'metal_purity', code: '950', name: '950 Platinum', sortOrder: 8, metadata: { applicableMetals: ['PLATINUM'] } },
  { kind: 'metal_purity', code: '900', name: '900 Platinum', sortOrder: 9, metadata: { applicableMetals: ['PLATINUM'] } },
  // Metal colors (metadata.hex + applicableMetals)
  { kind: 'metal_color', code: 'WHITE', name: 'White', sortOrder: 1, metadata: { hex: '#E8E8E8', applicableMetals: ['GOLD'] } },
  { kind: 'metal_color', code: 'YELLOW', name: 'Yellow', sortOrder: 2, metadata: { hex: '#E6C200', applicableMetals: ['GOLD'] } },
  { kind: 'metal_color', code: 'ROSE', name: 'Rose', sortOrder: 3, metadata: { hex: '#E0A899', applicableMetals: ['GOLD'] } },
  { kind: 'metal_color', code: 'SILVER', name: 'Silver', sortOrder: 4, metadata: { hex: '#C0C0C0', applicableMetals: ['SILVER'] } },
  { kind: 'metal_color', code: 'PLATINUM', name: 'Platinum', sortOrder: 5, metadata: { hex: '#D6D6D6', applicableMetals: ['PLATINUM'] } },
  // Diamond quality (clarity-led grades)
  { kind: 'diamond_quality', code: 'FL', name: 'FL (Flawless)', sortOrder: 1 },
  { kind: 'diamond_quality', code: 'IF', name: 'IF (Internally Flawless)', sortOrder: 2 },
  { kind: 'diamond_quality', code: 'VVS1', name: 'VVS1', sortOrder: 3 },
  { kind: 'diamond_quality', code: 'VVS2', name: 'VVS2', sortOrder: 4 },
  { kind: 'diamond_quality', code: 'VS1', name: 'VS1', sortOrder: 5 },
  { kind: 'diamond_quality', code: 'VS2', name: 'VS2', sortOrder: 6 },
  { kind: 'diamond_quality', code: 'SI1', name: 'SI1', sortOrder: 7 },
  { kind: 'diamond_quality', code: 'SI2', name: 'SI2', sortOrder: 8 },
  // Setting types
  { kind: 'setting_type', code: 'PRONG', name: 'Prong', sortOrder: 1 },
  { kind: 'setting_type', code: 'BEZEL', name: 'Bezel', sortOrder: 2 },
  { kind: 'setting_type', code: 'PAVE', name: 'Pavé', sortOrder: 3 },
  { kind: 'setting_type', code: 'CHANNEL', name: 'Channel', sortOrder: 4 },
  { kind: 'setting_type', code: 'HALO', name: 'Halo', sortOrder: 5 },
  { kind: 'setting_type', code: 'TENSION', name: 'Tension', sortOrder: 6 },
]

@Injectable()
export class CatalogSeeder {
  private readonly logger = new Logger('CatalogSeeder')
  constructor(
    @InjectRepository(CatalogMaster) private readonly repo: Repository<CatalogMaster>,
  ) {}

  async seedDefaults() {
    const count = await this.repo.count({ where: { tenantId: TENANT } })
    if (count > 0) return
    const rows = SEEDS.map((s) =>
      this.repo.create({
        tenantId: TENANT,
        kind: s.kind,
        code: s.code,
        name: s.name,
        sortOrder: s.sortOrder ?? 0,
        seoSlug: s.seoSlug,
        synonyms: s.synonyms || [],
        metadata: s.metadata || {},
        status: 'active',
      }),
    )
    await this.repo.save(rows)
    this.logger.log(`Seeded ${rows.length} catalog master values`)
  }
}
