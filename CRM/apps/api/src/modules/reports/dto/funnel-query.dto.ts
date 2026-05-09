import { IsOptional, IsIn, IsDateString } from 'class-validator';

export class FunnelQueryDto {
  @IsOptional()
  @IsIn(['snapshot', 'flow'])
  mode?: 'snapshot' | 'flow' = 'snapshot';

  @IsOptional()
  @IsIn(['created', 'expected_close'])
  timeField?: 'created' | 'expected_close' = 'created';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
