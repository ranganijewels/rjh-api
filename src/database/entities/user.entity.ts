import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm'
import { Tenant } from './tenant.entity'

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'staff' | 'viewer'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true, length: 255 })
  @Index()
  email: string

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string

  @Column({ name: 'full_name', length: 255, nullable: true })
  fullName: string

  @Column({
    type: 'varchar',
    length: 50,
    default: 'staff',
    enum: ['super_admin', 'admin', 'manager', 'staff', 'viewer'],
  })
  role: UserRole

  @Column({ name: 'tenant_id' })
  tenantId: string

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant

  @Column({ name: 'is_active', default: true })
  isActive: boolean

  @Column({ nullable: true, length: 255 })
  avatar: string

  @Column({ nullable: true, length: 20 })
  phone: string

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: string | null

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
