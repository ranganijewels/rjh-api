import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CmsPage } from '../../database/entities/cms-page.entity'
import { CmsBlog } from '../../database/entities/cms-blog.entity'
import { CmsFaq } from '../../database/entities/cms-faq.entity'
import { CmsNavigation } from '../../database/entities/cms-navigation.entity'
import { CmsSection } from '../../database/entities/cms-section.entity'
import { Tenant } from '../../database/entities/tenant.entity'
import { PaginationDto, paginate } from '../../common/dto/pagination.dto'
import { sanitizeHtml } from '../../common/utils/sanitize-html'

interface NavigationNode extends CmsNavigation {
  children: NavigationNode[]
}

@Injectable()
export class CmsService {
  constructor(
    @InjectRepository(CmsPage)
    private readonly pageRepo: Repository<CmsPage>,

    @InjectRepository(CmsBlog)
    private readonly blogRepo: Repository<CmsBlog>,

    @InjectRepository(CmsFaq)
    private readonly faqRepo: Repository<CmsFaq>,

    @InjectRepository(CmsNavigation)
    private readonly navRepo: Repository<CmsNavigation>,

    @InjectRepository(CmsSection)
    private readonly sectionRepo: Repository<CmsSection>,

    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  // ─── Theme ────────────────────────────────────────────────────────────────

  private defaultTheme() {
    return {
      brand_name: 'Rangani Jewellery House',
      logo_url: '',
      favicon_url: '',
      primary_color: '#2563eb',
      secondary_color: '#1e3a8a',
      accent_color: '#d4af37',
      font_heading: 'Playfair Display',
      font_body: 'Inter',
      contact_email: '',
      contact_phone: '',
      address: '',
      social: { instagram: '', facebook: '', youtube: '', pinterest: '' },
    }
  }

  async getTheme(tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } })
    const stored = tenant?.settings?.theme || {}
    return { ...this.defaultTheme(), ...stored }
  }

  async updateTheme(tenantId: string, dto: Record<string, any>) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } })
    if (!tenant) throw new NotFoundException('Tenant not found')
    const merged = { ...(tenant.settings || {}) }
    merged.theme = { ...this.defaultTheme(), ...(merged.theme || {}), ...dto }
    tenant.settings = merged
    await this.tenantRepo.save(tenant)
    return merged.theme
  }

  // ─── Pages ────────────────────────────────────────────────────────────────

  async getPage(tenantId: string, slug: string): Promise<CmsPage> {
    const page = await this.pageRepo.findOne({
      where: { tenantId, slug, isPublished: true },
    })
    if (!page) throw new NotFoundException('Page not found')
    return page
  }

  async listPages(tenantId: string): Promise<CmsPage[]> {
    return this.pageRepo.find({ where: { tenantId }, order: { createdAt: 'ASC' } })
  }

  async upsertPage(
    tenantId: string,
    slug: string,
    dto: Partial<CmsPage>,
    userId: string,
  ): Promise<CmsPage> {
    // Sanitize page HTML — it's rendered via dangerouslySetInnerHTML on the storefront.
    if (typeof dto.content === 'string') {
      dto = { ...dto, content: sanitizeHtml(dto.content) }
    }
    let page = await this.pageRepo.findOne({ where: { tenantId, slug } })

    if (page) {
      Object.assign(page, dto)
      if (dto.isPublished && !page.publishedAt) {
        page.publishedAt = new Date()
      }
    } else {
      page = this.pageRepo.create({
        ...dto,
        tenantId,
        slug,
        createdBy: userId,
      })
      if (dto.isPublished) page.publishedAt = new Date()
    }

    return this.pageRepo.save(page)
  }

  async togglePageStatus(tenantId: string, slug: string, userId: string): Promise<CmsPage> {
    let page = await this.pageRepo.findOne({ where: { tenantId, slug } })
    if (!page) {
      page = this.pageRepo.create({ tenantId, slug, title: slug, content: '', createdBy: userId })
    }
    page.isPublished = !page.isPublished
    if (page.isPublished && !page.publishedAt) page.publishedAt = new Date()
    return this.pageRepo.save(page)
  }

  // ─── Sections ─────────────────────────────────────────────────────────────

  async getSections(tenantId: string, pageSlug: string): Promise<CmsSection[]> {
    return this.sectionRepo.find({
      where: { tenantId, pageSlug },
      order: { sortOrder: 'ASC' },
    })
  }

  async getSection(tenantId: string, id: string): Promise<CmsSection> {
    const section = await this.sectionRepo.findOne({ where: { id, tenantId } })
    if (!section) throw new NotFoundException('Section not found')
    return section
  }

  async createSection(tenantId: string, dto: Partial<CmsSection>, userId: string): Promise<CmsSection> {
    const section = this.sectionRepo.create({ ...dto, tenantId, createdBy: userId })
    return this.sectionRepo.save(section)
  }

  async updateSection(tenantId: string, id: string, dto: Partial<CmsSection>, userId: string): Promise<CmsSection> {
    const section = await this.sectionRepo.findOne({ where: { id, tenantId } })
    if (!section) throw new NotFoundException('Section not found')
    Object.assign(section, dto, { updatedBy: userId })
    return this.sectionRepo.save(section)
  }

  async deleteSection(tenantId: string, id: string): Promise<void> {
    const section = await this.sectionRepo.findOne({ where: { id, tenantId } })
    if (!section) throw new NotFoundException('Section not found')
    await this.sectionRepo.remove(section)
  }

  async reorderSections(tenantId: string, pageSlug: string, orderedIds: string[]): Promise<CmsSection[]> {
    const sections = await this.sectionRepo.find({ where: { tenantId, pageSlug } })
    const updates = sections.map((s) => {
      const idx = orderedIds.indexOf(s.id)
      return this.sectionRepo.save({ ...s, sortOrder: idx >= 0 ? idx : s.sortOrder })
    })
    await Promise.all(updates)
    return this.getSections(tenantId, pageSlug)
  }

  async seedDefaultSections(tenantId: string, pageSlug: string, userId: string): Promise<CmsSection[]> {
    const existing = await this.sectionRepo.count({ where: { tenantId, pageSlug } })
    if (existing > 0) return this.getSections(tenantId, pageSlug)

    const defaults = this.getDefaultSections(pageSlug)
    const created = await Promise.all(
      defaults.map((s, i) =>
        this.sectionRepo.save(
          this.sectionRepo.create({ ...s, tenantId, pageSlug, sortOrder: i, createdBy: userId }),
        ),
      ),
    )
    return created
  }

  private getDefaultSections(pageSlug: string): Partial<CmsSection>[] {
    const homepage = [
      {
        sectionKey: 'top-header',
        sectionType: 'text-only',
        label: 'Top Header',
        description: 'Only text',
        isPublished: true,
        content: { text: 'Certified diamonds | IGI & GIA certified | BIS Hallmarked Gold | Free insured worldwide shipping' },
      },
      {
        sectionKey: 'header',
        sectionType: 'center-logo',
        label: 'Header',
        description: 'Center logo',
        isPublished: true,
        content: {
          icons: [
            { key: 'profile', label: 'Profile', link: '/account', enabled: true },
            { key: 'wishlist', label: 'Wishlist', link: '/wishlist', enabled: true },
            { key: 'cart', label: 'Cart', link: '/cart', enabled: true },
          ],
          menuItems: [],
        },
      },
      {
        sectionKey: 'hero-banner',
        sectionType: 'banner-2-cta',
        label: 'Hero Banner',
        description: 'Banner with 2 CTA',
        isPublished: true,
        content: {
          imageUrl: '',
          heading: 'Exquisite Fine Jewelry Collection',
          subHeading: 'Discover timeless elegance crafted with precision',
          cta1Text: 'Shop Now',
          cta1Link: '/product',
          cta1Style: 'primary',
          cta2Text: 'Explore Collections',
          cta2Link: '/collection',
          cta2Style: 'outline',
        },
      },
      {
        sectionKey: 'featured-collection',
        sectionType: 'four-column',
        label: 'Featured Collection',
        description: 'Four column section',
        isPublished: true,
        content: {
          heading: 'Featured Collections',
          subHeading: 'Timeless Elegance, Crafted for You',
          banners: [
            { imageUrl: '', text: 'Engagement Rings', link: '/collection/engagement-rings', openInNewTab: false },
            { imageUrl: '', text: 'Diamond Earrings', link: '/collection/diamond-earrings', openInNewTab: false },
            { imageUrl: '', text: 'Gold Necklaces', link: '/collection/gold-necklaces', openInNewTab: false },
            { imageUrl: '', text: 'Bracelets', link: '/collection/bracelets', openInNewTab: false },
          ],
        },
      },
      {
        sectionKey: 'product-variants',
        sectionType: 'four-column',
        label: 'Product Variants',
        description: 'Four column section',
        isPublished: true,
        content: {
          heading: 'Personalized Shopping Experience',
          subHeading: 'Your dream diamond awaits—whether it\'s hidden in our exclusive vault or waiting to be crafted just for you.',
          backgroundColor: '#EFEBE7',
          banners: [
            { imageUrl: '', text: 'Round', link: '/round-products', openInNewTab: false },
            { imageUrl: '', text: 'Princess', link: '/princess-products', openInNewTab: false },
            { imageUrl: '', text: 'Oval', link: '/oval-products', openInNewTab: false },
            { imageUrl: '', text: 'Cushion', link: '/cushion-products', openInNewTab: false },
          ],
        },
      },
      {
        sectionKey: 'why-choose',
        sectionType: 'banner-video',
        label: 'Why Choose Us',
        description: 'Banner + Video',
        isPublished: true,
        content: {
          heading: 'Why Choose RJ House',
          subHeading: 'We craft jewelry that tells your story',
          videoUrl: '',
          features: [
            { icon: '💎', title: 'Certified Diamonds', description: 'IGI & GIA certified stones' },
            { icon: '🏆', title: 'Premium Quality', description: 'BIS Hallmarked gold & platinum' },
            { icon: '🚚', title: 'Free Shipping', description: 'Free insured delivery across India' },
            { icon: '↩️', title: 'Easy Returns', description: '30-day hassle-free returns' },
          ],
        },
      },
      {
        sectionKey: 'newsletter',
        sectionType: 'input-social',
        label: 'Newsletter',
        description: 'Input field with social links',
        isPublished: true,
        content: {
          heading: 'Stay in the Loop',
          subHeading: 'Subscribe for exclusive offers, new arrivals, and jewelry inspiration',
          backgroundColor: '#EFEBE7',
          placeholder: 'Enter your email address',
          privacyText: 'By subscribing, you agree to our Privacy Policy. We\'ll never spam you.',
          button: { text: 'Subscribe', link: '', style: 'primary', color: '#c8a96e', textColor: '#ffffff' },
          socialLinks: [
            { platform: 'Instagram', url: 'https://instagram.com', enabled: true },
            { platform: 'Facebook', url: 'https://facebook.com', enabled: true },
            { platform: 'Pinterest', url: 'https://pinterest.com', enabled: false },
          ],
        },
      },
      {
        sectionKey: 'customer-reviews',
        sectionType: 'video-images',
        label: 'Customer Reviews',
        description: 'Video + images',
        isPublished: true,
        content: {
          heading: 'What Our Customers Say',
          subHeading: 'Real stories from real people who love RJ House jewelry',
          backgroundColor: '#ffffff',
          reviews: [
            {
              imageUrl: '',
              text: 'Beautiful Collection',
              link: '/reviews',
              openInNewTab: false,
              description: 'Absolutely stunning pieces! The quality exceeded my expectations.',
              rating: 5,
            },
          ],
        },
      },
      {
        sectionKey: 'footer',
        sectionType: 'informative',
        label: 'Footer',
        description: 'Informative',
        isPublished: true,
        content: {
          columns: [
            {
              title: 'Company',
              links: [
                { title: 'About RJ House', link: '/about', subLinks: [] },
                { title: 'Our Craftsmanship', link: '/craftsmanship', subLinks: [] },
                { title: 'Sustainability', link: '/sustainability', subLinks: [] },
              ],
            },
            {
              title: 'Shop',
              links: [
                { title: 'All Jewelry', link: '/product', subLinks: [] },
                { title: 'Diamond Rings', link: '/collection/rings', subLinks: [] },
                { title: 'Necklaces', link: '/collection/necklaces', subLinks: [] },
              ],
            },
            {
              title: 'Support',
              links: [
                { title: 'Contact Us', link: '/contact', subLinks: [] },
                { title: 'FAQs', link: '/faqs', subLinks: [] },
                { title: 'Shipping & Returns', link: '/shipping', subLinks: [] },
              ],
            },
          ],
          bottomBar: {
            copyright: '© 2026 RJ House. All rights reserved.',
            links: [
              { title: 'Privacy Policy', link: '/privacy-policy' },
              { title: 'Terms of Service', link: '/terms' },
            ],
          },
        },
      },
    ]

    const defaultSections: Record<string, Partial<CmsSection>[]> = {
      homepage,
      'about-us': [
        { sectionKey: 'hero', sectionType: 'hero', label: 'Hero', description: 'Page hero', isPublished: true, content: { heading: 'Our Story', subHeading: 'Crafting jewelry since 1990', imageUrl: '' } },
        { sectionKey: 'story', sectionType: 'text-image', label: 'Our Story', description: 'Story section', isPublished: true, content: { heading: 'The RJ House Legacy', body: 'Founded in 1990...', imageUrl: '' } },
      ],
      blogs: [
        { sectionKey: 'blog-hero', sectionType: 'hero', label: 'Blog Hero', description: 'Blog listing hero', isPublished: true, content: { heading: 'RJ House Blog', subHeading: 'Jewelry tips, trends, and inspiration' } },
      ],
    }

    return defaultSections[pageSlug] || [
      {
        sectionKey: 'hero',
        sectionType: 'hero',
        label: 'Hero Banner',
        description: 'Page hero section',
        isPublished: true,
        content: { heading: pageSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), subHeading: '', imageUrl: '' },
      },
    ]
  }

  // ─── Blogs ────────────────────────────────────────────────────────────────

  async getBlogs(
    tenantId: string,
    dto: PaginationDto & { tag?: string; publicOnly?: boolean; adminMode?: boolean },
  ) {
    const qb = this.blogRepo
      .createQueryBuilder('blog')
      .where('blog.tenantId = :tenantId', { tenantId })

    if (!dto.adminMode && dto.publicOnly !== false) {
      qb.andWhere('blog.isPublished = true')
    }

    if (dto.tag) {
      qb.andWhere(':tag = ANY(blog.tags)', { tag: dto.tag })
    }

    if (dto.search) {
      qb.andWhere('(blog.title ILIKE :search OR blog.excerpt ILIKE :search)', {
        search: `%${dto.search}%`,
      })
    }

    qb.orderBy(`blog.${dto.sortBy || 'publishedAt'}`, dto.sortDir === 'asc' ? 'ASC' : 'DESC')
      .skip(dto.skip)
      .take(dto.limit || 20)

    const [data, total] = await qb.getManyAndCount()
    return paginate(data, total, dto)
  }

  async getBlog(tenantId: string, slug: string): Promise<CmsBlog> {
    const blog = await this.blogRepo.findOne({ where: { tenantId, slug } })
    if (!blog) throw new NotFoundException('Blog post not found')
    return blog
  }

  async getBlogById(tenantId: string, id: string): Promise<CmsBlog> {
    const blog = await this.blogRepo.findOne({ where: { id, tenantId } })
    if (!blog) throw new NotFoundException('Blog post not found')
    return blog
  }

  async createBlog(tenantId: string, dto: Partial<CmsBlog>, userId: string): Promise<CmsBlog> {
    const title = (dto.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const base = title || 'post'
    let slug = base
    let n = 1
    while (await this.blogRepo.findOne({ where: { tenantId, slug } })) {
      slug = `${base}-${n++}`
    }
    const blog = this.blogRepo.create({ ...dto, tenantId, slug, createdBy: userId })
    if (dto.isPublished) blog.publishedAt = new Date()
    return this.blogRepo.save(blog)
  }

  async upsertBlog(
    tenantId: string,
    slug: string,
    dto: Partial<CmsBlog>,
    userId: string,
  ): Promise<CmsBlog> {
    // Blog bodies render as HTML on the storefront — sanitize like pages.
    if (typeof (dto as any).content === 'string') {
      dto = { ...dto, content: sanitizeHtml((dto as any).content) } as any
    }
    let blog = await this.blogRepo.findOne({ where: { tenantId, slug } })

    if (blog) {
      Object.assign(blog, dto)
      if (dto.isPublished && !blog.publishedAt) {
        blog.publishedAt = new Date()
      }
    } else {
      blog = this.blogRepo.create({
        ...dto,
        tenantId,
        slug,
        createdBy: userId,
      })
      if (dto.isPublished) blog.publishedAt = new Date()
    }

    return this.blogRepo.save(blog)
  }

  async updateBlogById(tenantId: string, id: string, dto: Partial<CmsBlog>, userId: string): Promise<CmsBlog> {
    const blog = await this.blogRepo.findOne({ where: { id, tenantId } })
    if (!blog) throw new NotFoundException('Blog post not found')
    Object.assign(blog, dto)
    if (dto.isPublished && !blog.publishedAt) blog.publishedAt = new Date()
    return this.blogRepo.save(blog)
  }

  async deleteBlog(tenantId: string, id: string): Promise<void> {
    const blog = await this.blogRepo.findOne({ where: { id, tenantId } })
    if (!blog) throw new NotFoundException('Blog post not found')
    await this.blogRepo.remove(blog)
  }

  async toggleBlogStatus(tenantId: string, id: string): Promise<CmsBlog> {
    const blog = await this.blogRepo.findOne({ where: { id, tenantId } })
    if (!blog) throw new NotFoundException('Blog post not found')
    blog.isPublished = !blog.isPublished
    if (blog.isPublished && !blog.publishedAt) blog.publishedAt = new Date()
    return this.blogRepo.save(blog)
  }

  // ─── FAQs ─────────────────────────────────────────────────────────────────

  async getFaqs(tenantId: string, category?: string, adminMode = false): Promise<CmsFaq[]> {
    const qb = this.faqRepo
      .createQueryBuilder('faq')
      .where('faq.tenantId = :tenantId', { tenantId })

    if (!adminMode) {
      qb.andWhere('faq.isActive = true')
    }

    if (category) {
      qb.andWhere('faq.category = :category', { category })
    }

    return qb.orderBy('faq.sortOrder', 'ASC').getMany()
  }

  async getFaqById(tenantId: string, id: string): Promise<CmsFaq> {
    const faq = await this.faqRepo.findOne({ where: { id, tenantId } })
    if (!faq) throw new NotFoundException('FAQ not found')
    return faq
  }

  async upsertFaq(
    tenantId: string,
    dto: Partial<CmsFaq>,
    userId: string,
    id?: string,
  ): Promise<CmsFaq> {
    let faq: CmsFaq | null = null

    if (id) {
      faq = await this.faqRepo.findOne({ where: { id, tenantId } })
      if (!faq) throw new NotFoundException('FAQ not found')
      Object.assign(faq, dto)
    } else {
      faq = this.faqRepo.create({ ...dto, tenantId })
    }

    return this.faqRepo.save(faq)
  }

  async deleteFaq(tenantId: string, id: string): Promise<void> {
    const faq = await this.faqRepo.findOne({ where: { id, tenantId } })
    if (!faq) throw new NotFoundException('FAQ not found')
    await this.faqRepo.remove(faq)
  }

  async toggleFaqStatus(tenantId: string, id: string): Promise<CmsFaq> {
    const faq = await this.faqRepo.findOne({ where: { id, tenantId } })
    if (!faq) throw new NotFoundException('FAQ not found')
    faq.isActive = !faq.isActive
    return this.faqRepo.save(faq)
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  async createNavItem(tenantId: string, dto: Record<string, any>): Promise<CmsNavigation> {
    const item = this.navRepo.create({ ...dto, tenantId })
    return this.navRepo.save(item)
  }

  async getNavigation(tenantId: string): Promise<NavigationNode[]> {
    const items = await this.navRepo.find({
      where: { tenantId, isActive: true },
      order: { sortOrder: 'ASC' },
    })

    const nodeMap = new Map<string, NavigationNode>()
    const roots: NavigationNode[] = []

    for (const item of items) {
      nodeMap.set(item.id, { ...item, children: [] })
    }

    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    }

    return roots
  }
}
