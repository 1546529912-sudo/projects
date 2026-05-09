import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFollowUpDto {
  @IsString()
  content!: string;

  @IsDateString()
  followUpTime!: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contactId?: number;
}
