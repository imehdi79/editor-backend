import { IsNotEmpty, IsNumber, IsObject, IsString, Min } from 'class-validator';

/**
 * Validates the pricing-settings envelope on PUT /pricing. The per-material
 * `rates` map is pass-through JSON (`@IsObject()` checks it is an object but
 * never inspects its contents) — so new materials / rule fields stay
 * forward-compatible with ZERO backend change, exactly like the page document.
 */
export class UpsertPricingDto {
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsNumber()
  @Min(0)
  demolishRate!: number;

  @IsObject()
  rates!: Record<string, Record<string, unknown>>;
}
