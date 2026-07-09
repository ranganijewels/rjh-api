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
  // Product types (ERP "Select Producttype" dropdown)
  { kind: 'product_type', code: 'DIAMOND', name: 'Diamond Jewellery', sortOrder: 1 },
  { kind: 'product_type', code: 'GOLD', name: 'Gold Jewellery', sortOrder: 2 },
  { kind: 'product_type', code: 'SILVER', name: 'Silver Jewellery', sortOrder: 3 },
  { kind: 'product_type', code: 'PLATINUM', name: 'Platinum Jewellery', sortOrder: 4 },
  // Metal types
  { kind: 'metal_type', code: 'GOLD', name: 'Gold', sortOrder: 1 },
  { kind: 'metal_type', code: 'SILVER', name: 'Silver', sortOrder: 2 },
  { kind: 'metal_type', code: 'PLATINUM', name: 'Platinum', sortOrder: 3 },
  // Metal purities (metadata.applicableMetals drives the configurator).
  // metadata.pricingFactor drives DERIVED gold pricing: admin enters only the
  // 24K rate; each karat prices at 24K × pricingFactor / 99.9
  // (18K = ×78/99.9, 14K = ×60/99.9, 10K = ×43/99.9).
  { kind: 'metal_purity', code: '24K', name: '24K', sortOrder: 1, metadata: { applicableMetals: ['GOLD'], pricingFactor: 99.9 } },
  { kind: 'metal_purity', code: '22K', name: '22K', sortOrder: 2, metadata: { applicableMetals: ['GOLD'], pricingFactor: 91.6 } },
  { kind: 'metal_purity', code: '18K', name: '18K', sortOrder: 3, metadata: { applicableMetals: ['GOLD'], pricingFactor: 78 } },
  { kind: 'metal_purity', code: '14K', name: '14K', sortOrder: 4, metadata: { applicableMetals: ['GOLD'], pricingFactor: 60 } },
  { kind: 'metal_purity', code: '10K', name: '10K', sortOrder: 5, metadata: { applicableMetals: ['GOLD'], pricingFactor: 43 } },
  { kind: 'metal_purity', code: '999', name: '999 (Fine Silver)', sortOrder: 6, metadata: { applicableMetals: ['SILVER'] } },
  { kind: 'metal_purity', code: '925', name: '925 (Sterling)', sortOrder: 7, metadata: { applicableMetals: ['SILVER'] } },
  { kind: 'metal_purity', code: '800', name: '800', sortOrder: 8, metadata: { applicableMetals: ['SILVER'] } },
  { kind: 'metal_purity', code: '950', name: '950 Platinum', sortOrder: 9, metadata: { applicableMetals: ['PLATINUM'] } },
  { kind: 'metal_purity', code: '900', name: '900 Platinum', sortOrder: 10, metadata: { applicableMetals: ['PLATINUM'] } },
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
    if (count > 0) {
      await this.ensurePricingDefaults()
      return
    }
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

  // Idempotent upgrade for databases seeded BEFORE derived KT pricing existed:
  // adds the 10K purity and stamps pricingFactor on gold purities that lack it.
  // Runs on every boot; no-ops once applied. Admin edits to factors are kept.
  private async ensurePricingDefaults() {
    // product_type kind didn't exist in earlier installs — add missing rows.
    for (const seed of SEEDS.filter((x) => x.kind === 'product_type')) {
      const exists = await this.repo.findOne({
        where: { tenantId: TENANT, kind: 'product_type', code: seed.code },
      })
      if (!exists) {
        await this.repo.save(
          this.repo.create({
            tenantId: TENANT,
            kind: seed.kind,
            code: seed.code,
            name: seed.name,
            sortOrder: seed.sortOrder ?? 0,
            synonyms: [],
            metadata: {},
            status: 'active',
          }),
        )
        this.logger.log(`Added product_type ${seed.code}`)
      }
    }
    const goldPurities = SEEDS.filter(
      (s) => s.kind === 'metal_purity' && s.metadata?.pricingFactor != null,
    )
    for (const seed of goldPurities) {
      const row = await this.repo.findOne({
        where: { tenantId: TENANT, kind: 'metal_purity', code: seed.code },
      })
      if (!row) {
        await this.repo.save(
          this.repo.create({
            tenantId: TENANT,
            kind: seed.kind,
            code: seed.code,
            name: seed.name,
            sortOrder: seed.sortOrder ?? 0,
            synonyms: [],
            metadata: seed.metadata || {},
            status: 'active',
          }),
        )
        this.logger.log(`Added missing metal_purity ${seed.code}`)
      } else if (row.metadata?.pricingFactor == null) {
        row.metadata = { ...row.metadata, pricingFactor: seed.metadata!.pricingFactor }
        await this.repo.save(row)
        this.logger.log(`Stamped pricingFactor on metal_purity ${seed.code}`)
      }
    }
  }
}
