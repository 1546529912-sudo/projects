import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOpportunityDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsEnum(['initial_contact', 'proposal', 'negotiation', 'closed_won', 'closed_lost'])
  stage?: string;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;
}
