import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CloseOpportunityDto {
  @IsEnum(['closed_won', 'closed_lost'])
  outcome!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
