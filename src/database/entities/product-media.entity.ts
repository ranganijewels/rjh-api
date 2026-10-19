import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Product } from './product.entity'

@Entity('jeos_product_media')
export class ProductMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'product_id' })
  productId: string

  @ManyToOne(() => Product, (p) => p.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product

  @Column({ name: 'file_url', type: 'text' })
  fileUrl: string

  @Column({ name: 'file_name', nullable: true })
  fileName: string

  @Column({ name: 'file_path', nullable: true })
  filePath: string

  @Column({ name: 'bucket_name', nullable: true })
  bucketName: string

  @Column({ name: 'mime_type', nullable: true })
  mimeType: string

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number

  @Column({ name: 'media_type', default: 'image' })
  mediaType: string

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number

  @Column({ name: 'is_cover', default: false })
  isCover: boolean

  @Column({ name: 'title', nullable: true })
  title: string

  // Internal role marker only ("main" | "rollover" | "gallery") — NOT the
  // accessibility/SEO description shown to screen readers or search engines.
  // See seoAltText below for that.
  @Column({ name: 'alt_text', nullable: true })
  altText: string

  // Real, admin-editable image description for accessibility + SEO
  // (rendered as the <img alt="…">, and read by the sitemap/feed generators).
  @Column({ name: 'seo_alt_text', type: 'text', nullable: true })
  seoAltText: string

  @Column({ name: 'metal_color', nullable: true })
  metalColor: string

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
