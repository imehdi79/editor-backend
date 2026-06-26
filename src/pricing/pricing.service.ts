import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertPricingDto } from './dto/upsert-pricing.dto';
import { PricingSettings } from './pricing.types';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /pricing — the user's saved settings, or null when none saved yet. */
  async get(userId: string): Promise<PricingSettings | null> {
    const row = await this.prisma.pricingSettings.findUnique({
      where: { userId },
    });
    return row ? this.toSettings(row) : null;
  }

  /**
   * PUT /pricing — upsert the user's settings (one row per user). The server
   * owns `updatedAt` (always now). The `rates` map is stored verbatim as jsonb.
   */
  async upsert(
    userId: string,
    dto: UpsertPricingDto,
  ): Promise<PricingSettings> {
    const rates = dto.rates as unknown as Prisma.InputJsonValue;
    const now = Date.now();

    const row = await this.prisma.pricingSettings.upsert({
      where: { userId },
      create: {
        userId,
        currency: dto.currency,
        demolishRate: dto.demolishRate,
        rates,
        updatedAt: now,
      },
      update: {
        currency: dto.currency,
        demolishRate: dto.demolishRate,
        rates,
        updatedAt: now,
      },
    });

    return this.toSettings(row);
  }

  private toSettings(row: {
    currency: string;
    demolishRate: number;
    rates: Prisma.JsonValue;
  }): PricingSettings {
    return {
      currency: row.currency,
      demolishRate: row.demolishRate,
      rates:
        (row.rates as unknown as PricingSettings['rates']) ?? {},
    };
  }
}
