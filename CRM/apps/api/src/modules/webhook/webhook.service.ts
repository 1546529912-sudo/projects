import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(actor: CurrentUserPayload) {
    if (actor.role !== 'admin') return [];
    const configs = await this.prisma.webhookConfig.findMany({ orderBy: { createdAt: 'desc' } });
    return configs.map((c) => ({ ...c, id: c.id.toString() }));
  }

  async create(actor: CurrentUserPayload, dto: { name: string; url: string; events: string[]; secret?: string }) {
    const config = await this.prisma.webhookConfig.create({
      data: { name: dto.name, url: dto.url, events: dto.events, secret: dto.secret ?? null },
    });
    return { ...config, id: config.id.toString() };
  }

  async update(actor: CurrentUserPayload, id: string, dto: { name?: string; url?: string; events?: string[]; secret?: string | null; isActive?: boolean }) {
    const config = await this.prisma.webhookConfig.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.url !== undefined ? { url: dto.url } : {}),
        ...(dto.events !== undefined ? { events: dto.events } : {}),
        ...(dto.secret !== undefined ? { secret: dto.secret } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return { ...config, id: config.id.toString() };
  }

  async delete(id: string) {
    await this.prisma.webhookConfig.delete({ where: { id: BigInt(id) } });
    return { deleted: true };
  }

  async fire(event: string, payload: Record<string, any>) {
    const configs = await this.prisma.webhookConfig.findMany({
      where: { isActive: true, events: { has: event } },
    });

    for (const config of configs) {
      void this.dispatch(config, event, payload);
    }
  }

  private async dispatch(config: { id: bigint; url: string; secret: string | null }, event: string, payload: Record<string, any>) {
    const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-CRM-Event': event };
    if (config.secret) {
      const sig = createHmac('sha256', config.secret).update(body).digest('hex');
      headers['X-CRM-Signature'] = `sha256=${sig}`;
    }
    try {
      const res = await fetch(config.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000) });
      await this.prisma.webhookConfig.update({ where: { id: config.id }, data: { lastFiredAt: new Date() } });
      if (!res.ok) this.logger.warn(`Webhook ${config.id} responded ${res.status} for event ${event}`);
    } catch (err: any) {
      this.logger.error(`Webhook ${config.id} dispatch failed: ${err.message}`);
    }
  }
}
