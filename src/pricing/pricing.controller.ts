import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpsertPricingDto } from './dto/upsert-pricing.dto';
import { PricingService } from './pricing.service';
import { PricingSettings } from './pricing.types';

@Controller('pricing')
@UseGuards(JwtAuthGuard) // every pricing route requires a valid JWT
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  /** GET /pricing → 200 PricingSettings (the user's), or 200 null when unset. */
  @Get()
  get(@CurrentUser() user: AuthUser): Promise<PricingSettings | null> {
    return this.pricing.get(user.userId);
  }

  /** PUT /pricing → 200 PricingSettings. Upsert the current user's settings. */
  @Put()
  upsert(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertPricingDto,
  ): Promise<PricingSettings> {
    return this.pricing.upsert(user.userId, dto);
  }
}
