import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpsertProjectDto } from './dto/upsert-project.dto';
import { ProjectsService } from './projects.service';
import { Project, ProjectSummary } from './projects.types';

@Controller('projects')
@UseGuards(JwtAuthGuard) // every project route requires a valid JWT
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  /** GET /projects → 200 ProjectSummary[] (the user's, updatedAt desc). */
  @Get()
  list(@CurrentUser() user: AuthUser): Promise<ProjectSummary[]> {
    return this.projects.list(user.userId);
  }

  /**
   * GET /projects/recent?limit=N → 200 ProjectSummary[] (top N recents).
   * Declared before `:id` so it is never captured as an id.
   */
  @Get('recent')
  recent(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
  ): Promise<ProjectSummary[]> {
    const parsed = limit !== undefined ? Number(limit) : undefined;
    return this.projects.recent(
      user.userId,
      Number.isFinite(parsed) ? parsed : undefined,
    );
  }

  /** GET /projects/:id → 200 Project (full doc), or 404 when missing/not owned. */
  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<Project> {
    return this.projects.get(user.userId, id);
  }

  /** PUT /projects/:id → 200 Project. Upsert; body id must match path id. */
  @Put(':id')
  upsert(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpsertProjectDto,
  ): Promise<Project> {
    if (dto.id !== id) {
      throw new BadRequestException(
        `Body id "${dto.id}" does not match path id "${id}"`,
      );
    }
    return this.projects.upsert(user.userId, dto);
  }

  /** DELETE /projects/:id → 204. Idempotent. */
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.projects.remove(user.userId, id);
  }
}
