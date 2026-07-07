import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Design } from './design.entity'

@Entity('jeos_design_media')
export class DesignMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'design_id' })
  designId: string

  @ManyToOne(() => Design, (d) => d.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design

  @Column({ name: 'file_url', type: 'text' })
  fileUrl: string

  @Column({ name: 'file_path', nullable: true })
  filePath: string

  @Column({ name: 'bucket_name', nullable: true })
  bucketName: string

  @Column({ name: 'media_type', default: 'image' })
  mediaType: string

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
