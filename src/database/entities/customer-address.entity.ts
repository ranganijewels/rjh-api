import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm'
import { Customer } from './customer.entity'

@Entity('jeos_customer_addresses')
export class CustomerAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'customer_id' })
  customerId: string

  @ManyToOne(() => Customer, (c) => c.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer

  @Column({ default: 'Home' })
  label: string

  @Column({ name: 'recipient_name' })
  recipientName: string

  @Column()
  phone: string

  @Column({ name: 'address_line1' })
  addressLine1: string

  @Column({ name: 'address_line2', nullable: true })
  addressLine2: string

  @Column()
  city: string

  @Column()
  state: string

  @Column()
  country: string

  @Column()
  pincode: string

  @Column({ name: 'is_default', default: false })
  isDefault: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
