import { IsOptional, IsIn, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class PerformanceQueryDto {
  @IsOptional()
  @IsIn(['month', 'quarter', 'year'])
  periodType?: 'month' | 'quarter' | 'year' = 'month';

  // e.g. "2026-05" or "2026-Q2" or "2026"
  @IsOptional()
  @IsString()
  period?: string;
}

export class SetTargetDto {
  @IsIn(['month', 'quarter', 'year'])
  periodType!: 'month' | 'quarter' | 'year';

  @IsString()
  period!: string;

  @IsIn(['team', 'personal'])
  targetType!: 'team' | 'personal';

  @IsOptional()
  userId?: string;

  @IsNumber()
  @Type(() => Number)
  amount!: number;
}
