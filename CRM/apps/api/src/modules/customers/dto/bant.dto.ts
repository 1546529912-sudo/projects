import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class BantDto {
  @IsOptional() @IsInt() @Min(0) @Max(4) bantBudget?: number;
  @IsOptional() @IsInt() @Min(0) @Max(4) bantAuthority?: number;
  @IsOptional() @IsInt() @Min(0) @Max(4) bantNeed?: number;
  @IsOptional() @IsInt() @Min(0) @Max(4) bantTimeline?: number;
  @IsOptional() @IsString() bantNotes?: string;
}
