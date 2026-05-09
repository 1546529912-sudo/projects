import { IsBoolean, IsEnum, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ConvertLeadDto {
  @IsOptional()
  @IsBoolean()
  createOpportunity?: boolean;

  @IsOptional()
  @IsEnum(['A', 'B', 'C', 'D'])
  level?: 'A' | 'B' | 'C' | 'D';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number;
}
