import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

export enum LocationType {
  WAREHOUSE = 'warehouse',
  SHOWROOM = 'showroom',
  TRANSIT = 'transit',
  VAULT = 'vault',
  OTHER = 'other',
}

@Entity('jeos_inventory_locations')
export class InventoryLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'location_code', unique: true })
  locationCode: string;

  @Column({ name: 'location_name' })
  locationName: string;

  @Column({
    name: 'location_type',
    type: 'enum',
    enum: LocationType,
  })
  locationType: LocationType;

  @Column({ name: 'parent_location_id', nullable: true })
  parentLocationId: string | null;

  @ManyToOne(() => InventoryLocation, (location) => location.childLocations, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_location_id' })
  parentLocation: InventoryLocation | null;

  @OneToMany(() => InventoryLocation, (location) => location.parentLocation)
  childLocations: InventoryLocation[];

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  country: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
