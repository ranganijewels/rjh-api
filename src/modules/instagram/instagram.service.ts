import { Injectable, Logger, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'

const CACHE_KEY = 'instagram:feed'
const CACHE_TTL = 3600 // 1 hour

export interface InstagramMedia {
  id: string
  caption: string
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  mediaUrl: string
  thumbnailUrl: string
  permalink: string
  timestamp: string
}

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name)
  private readonly BASE = 'https://graph.instagram.com/v21.0'

  constructor(
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getFeed(limit = 12): Promise<InstagramMedia[]> {
    const cached = await this.cache.get<InstagramMedia[]>(CACHE_KEY)
    if (cached?.length) return cached

    const token = this.config.get<string>('INSTAGRAM_ACCESS_TOKEN')
    if (!token) {
      this.logger.warn('INSTAGRAM_ACCESS_TOKEN not configured — returning empty feed')
      return []
    }

    try {
      const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp'
      const url = `${this.BASE}/me/media?fields=${fields}&limit=${limit}&access_token=${token}`
      const res = await fetch(url)
      const json = await res.json()

      if (json.error) {
        this.logger.error(`Instagram API: ${json.error.message}`)
        return []
      }

      const media: InstagramMedia[] = (json.data || []).map((item: any) => ({
        id: item.id,
        caption: item.caption || '',
        mediaType: item.media_type as InstagramMedia['mediaType'],
        mediaUrl: item.media_url || '',
        thumbnailUrl: item.thumbnail_url || item.media_url || '',
        permalink: item.permalink || '',
        timestamp: item.timestamp || '',
      }))

      if (media.length) {
        await this.cache.set(CACHE_KEY, media, CACHE_TTL)
      }
      return media
    } catch (err) {
      this.logger.error('Failed to fetch Instagram feed', err)
      return []
    }
  }

  async refreshToken(): Promise<{ success: boolean; expiresIn?: number }> {
    const token = this.config.get<string>('INSTAGRAM_ACCESS_TOKEN')
    if (!token) return { success: false }

    try {
      const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.access_token) {
        this.logger.log(`Token refreshed — expires in ${json.expires_in}s`)
        return { success: true, expiresIn: json.expires_in }
      }
    } catch (err) {
      this.logger.error('Token refresh failed', err)
    }
    return { success: false }
  }

  async clearCache(): Promise<void> {
    await this.cache.del(CACHE_KEY)
  }
}
