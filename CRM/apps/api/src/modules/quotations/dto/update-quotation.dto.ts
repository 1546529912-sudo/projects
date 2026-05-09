import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateQuotationDto {
  @IsOptional() @IsIn(['draft', 'sent', 'accepted', 'rejected', 'expired']) status?: string;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsString() notes?: string;
}
