import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IsActivePage } from './active-page.validator';
import { PageDto } from './page.dto';

/**
 * Validates ONLY the Project envelope on PUT /projects/:id. Inner shape geometry
 * is never validated (see PageDto). `createdAt`/`updatedAt` are accepted but the
 * server is authoritative: it always overwrites `updatedAt` and preserves the
 * original `createdAt` (or sets it on first insert).
 */
export class UpsertProjectDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PageDto)
  pages!: PageDto[];

  @IsString()
  @IsNotEmpty()
  @IsActivePage()
  activePageId!: string;

  @IsOptional()
  @IsNumber()
  createdAt?: number;

  @IsOptional()
  @IsNumber()
  updatedAt?: number;
}
