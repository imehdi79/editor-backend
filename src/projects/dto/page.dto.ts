import { IsNotEmpty, IsObject, IsString } from 'class-validator';

/**
 * Only the page envelope is validated. `shapes` and `viewport` are pass-through
 * JSON (`@IsObject()` checks they are objects but never inspects their
 * contents) — this is what keeps future 3D fields forward-compatible.
 */
export class PageDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsObject()
  shapes!: Record<string, unknown>;

  @IsObject()
  viewport!: Record<string, unknown>;
}
