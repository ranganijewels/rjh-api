import { Injectable, NotFoundException } from '@nestjs/common'
import { PaginationDto } from '../../common/dto/pagination.dto'

@Injectable()
export class ChannelsService {
  private listings: Record<string, any>[] = []
  private exportLogs: Record<string, any>[] = []

  async getListings(tenantId: string, dto: PaginationDto) {
    const tenantListings = this.listings.filter((l) => l.tenantId === tenantId)
    return {
      data: tenantListings.slice(dto.skip, dto.skip + dto.limit),
      meta: { page: dto.page, limit: dto.limit, total: tenantListings.length, totalPages: Math.ceil(tenantListings.length / dto.limit) },
    }
  }

  async createListing(tenantId: string, dto: Record<string, any>, userId: string) {
    const listing = {
      id: `lst-${Date.now()}`,
      tenantId,
      ...dto,
      status: dto.status || 'draft',
      createdBy: userId,
      createdAt: new Date().toISOString(),
    }
    this.listings.push(listing)
    return listing
  }

  async updateListingStatus(tenantId: string, id: string, status: string) {
    const listing = this.listings.find((l) => l.id === id && l.tenantId === tenantId)
    if (!listing) throw new NotFoundException(`Listing ${id} not found`)
    listing.status = status
    listing.updatedAt = new Date().toISOString()
    return listing
  }

  async getExportLogs(tenantId: string, dto: PaginationDto) {
    const logs = this.exportLogs.filter((l) => l.tenantId === tenantId)
    return {
      data: logs.slice(dto.skip, dto.skip + dto.limit),
      meta: { page: dto.page, limit: dto.limit, total: logs.length, totalPages: Math.ceil(logs.length / dto.limit) },
    }
  }
}
