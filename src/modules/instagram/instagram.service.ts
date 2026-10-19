import { Injectable, Logger, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { Cron, CronExpression } from '@nestjs/schedule'
import * as fs from 'fs'
import * as path from 'path'

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
        await this.cache.set(CACHE_KEY, media, CACHE_TTL * 1000)
      }
      return media
    } catch (err) {
      this.logger.error('Failed to fetch Instagram feed', err)
      return []
    }
  }

  // Instagram long-lived tokens last ~60 days and must be refreshed before
  // they expire (refreshing too early or too late both fail). Runs weekly —
  // comfortably inside the window Instagram recommends (day 24 to day 60).
  @Cron(CronExpression.EVERY_WEEK)
  async scheduledTokenRefresh() {
    const result = await this.refreshToken()
    if (result.success) {
      this.logger.log(`Scheduled Instagram token refresh succeeded — expires in ${result.expiresIn}s`)
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
        this.persistToken(json.access_token)
        return { success: true, expiresIn: json.expires_in }
      }
      this.logger.error(`Token refresh returned no access_token: ${JSON.stringify(json)}`)
    } catch (err) {
      this.logger.error('Token refresh failed', err)
    }
    return { success: false }
  }

  // Makes the new token effective immediately for this running process (env
  // vars aren't hot-reloaded from disk) AND durable across restarts/deploys
  // by rewriting the .env file on disk — otherwise a refreshed token would
  // only live in memory and silently revert to the stale one on next deploy.
  private persistToken(newToken: string) {
    process.env.INSTAGRAM_ACCESS_TOKEN = newToken

    const envPath = path.resolve(process.cwd(), '.env')
    try {
      if (!fs.existsSync(envPath)) return
      const content = fs.readFileSync(envPath, 'utf8')
      const line = `INSTAGRAM_ACCESS_TOKEN=${newToken}`
      const updated = /^INSTAGRAM_ACCESS_TOKEN=.*$/m.test(content)
        ? content.replace(/^INSTAGRAM_ACCESS_TOKEN=.*$/m, line)
        : `${content.trimEnd()}\n${line}\n`
      fs.writeFileSync(envPath, updated, 'utf8')
    } catch (err) {
      this.logger.error('Failed to persist refreshed Instagram token to .env', err)
    }
  }

  async clearCache(): Promise<void> {
    await this.cache.del(CACHE_KEY)
  }
}
