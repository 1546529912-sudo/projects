import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryCustomersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(['following', 'interested', 'negotiating', 'won', 'lost'])
  status?: string;

  @IsOptional()
  @IsEnum(['A', 'B', 'C', 'D'])
  level?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number;

  @IsOptional()
  @IsEnum(['none', 'suspected', 'confirmed', 'ignored'])
  duplicateStatus?: string;

  @IsOptional()
  @IsEnum(['only', 'include', 'exclude'])
  archived?: 'only' | 'include' | 'exclude';

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  tagId?: string;
}
