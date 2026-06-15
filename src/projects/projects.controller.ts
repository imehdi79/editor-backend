import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard) // every project route requires a valid JWT
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}
}
