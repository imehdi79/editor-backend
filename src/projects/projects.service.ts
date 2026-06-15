import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProjectDto } from './dto/upsert-project.dto';
import { Page, Project, ProjectSummary } from './projects.types';

// Columns needed to build a ProjectSummary without shipping the full document.
const summarySelect = {
  id: true,
  name: true,
  pages: true,
  updatedAt: true,
} satisfies Prisma.ProjectSelect;

const DEFAULT_RECENT_LIMIT = 10;
const MAX_RECENT_LIMIT = 50;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /projects — the user's projects, recents first. */
  async list(userId: string): Promise<ProjectSummary[]> {
    const rows = await this.prisma.project.findMany({
      where: { userId },
      select: summarySelect,
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => this.toSummary(row));
  }

  /** GET /projects/recent?limit=N — the user's N most recently updated. */
  async recent(userId: string, limit?: number): Promise<ProjectSummary[]> {
    const take = Math.min(
      Math.max(1, Math.trunc(limit ?? DEFAULT_RECENT_LIMIT)),
      MAX_RECENT_LIMIT,
    );
    const rows = await this.prisma.project.findMany({
      where: { userId },
      select: summarySelect,
      orderBy: { updatedAt: 'desc' },
      take,
    });
    return rows.map((row) => this.toSummary(row));
  }

  /** GET /projects/:id — 404 when missing or not owned by the user. */
  async get(userId: string, id: string): Promise<Project> {
    const row = await this.prisma.project.findFirst({ where: { id, userId } });
    if (!row) {
      throw new NotFoundException(`Project "${id}" not found`);
    }
    return this.toProject(row);
  }

  /**
   * PUT /projects/:id — upsert by id, scoped to the owner. The server owns
   * `updatedAt` (always now) and preserves `createdAt`. Attempting to write a
   * project id owned by someone else is treated as not-found (no leak).
   */
  async upsert(userId: string, dto: UpsertProjectDto): Promise<Project> {
    const owner = await this.prisma.project.findUnique({
      where: { id: dto.id },
      select: { userId: true },
    });
    if (owner && owner.userId !== userId) {
      throw new NotFoundException(`Project "${dto.id}" not found`);
    }

    const now = Date.now();
    const pages = dto.pages as unknown as Prisma.InputJsonValue;

    const row = await this.prisma.project.upsert({
      where: { id: dto.id },
      create: {
        id: dto.id,
        name: dto.name,
        activePageId: dto.activePageId,
        pages,
        userId,
        createdAt: dto.createdAt ?? now,
        updatedAt: now,
      },
      update: {
        name: dto.name,
        activePageId: dto.activePageId,
        pages,
        updatedAt: now,
        // createdAt and userId deliberately omitted — never overwritten.
      },
    });

    return this.toProject(row);
  }

  /** DELETE /projects/:id — idempotent; only ever deletes the user's own. */
  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.project.deleteMany({ where: { id, userId } });
  }

  private toSummary(row: {
    id: string;
    name: string;
    pages: Prisma.JsonValue;
    updatedAt: number;
  }): ProjectSummary {
    return {
      id: row.id,
      name: row.name,
      pageCount: Array.isArray(row.pages) ? row.pages.length : 0,
      updatedAt: row.updatedAt,
    };
  }

  private toProject(row: {
    id: string;
    name: string;
    activePageId: string;
    pages: Prisma.JsonValue;
    createdAt: number;
    updatedAt: number;
  }): Project {
    return {
      id: row.id,
      name: row.name,
      activePageId: row.activePageId,
      pages: (row.pages as unknown as Page[]) ?? [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
