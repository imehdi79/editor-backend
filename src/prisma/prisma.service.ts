import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Thin wrapper around the generated PrismaClient so it participates in Nest's
 * lifecycle (connects on boot). Nest closes the pool on app shutdown via the
 * client's own beforeExit handling; enableShutdownHooks is wired in main.ts.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
