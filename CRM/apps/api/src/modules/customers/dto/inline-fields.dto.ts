import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class InlineFieldsDto {
  @IsOptional()
  @IsEnum(['A', 'B', 'C', 'D'])
  level?: 'A' | 'B' | 'C' | 'D';

  @IsOptional()
  @IsEnum(['following', 'interested', 'negotiating', 'won', 'lost'])
  status?: 'following' | 'interested' | 'negotiating' | 'won' | 'lost';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number;
}
