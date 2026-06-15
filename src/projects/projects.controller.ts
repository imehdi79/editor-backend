import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { ProjectSummary } from './projects.types';

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
}
