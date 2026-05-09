import { Injectable } from '@nestjs/common';
import { RedisService } from '../../infra/redis/redis.service';

@Injectable()
export class TokenBlacklistService {
  constructor(private readonly redis: RedisService) {}

  async blacklist(jti: string, ttlSeconds: number) {
    await this.redis.client.set(`auth:blacklist:${jti}`, '1', 'EX', Math.max(ttlSeconds, 1));
  }

  async isBlacklisted(jti: string) {
    const value = await this.redis.client.get(`auth:blacklist:${jti}`);
    return value === '1';
  }
}
