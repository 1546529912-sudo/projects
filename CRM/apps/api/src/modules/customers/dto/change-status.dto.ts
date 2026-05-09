import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ChangeStatusDto {
  @IsEnum(['following', 'interested', 'negotiating', 'won', 'lost'])
  toStatus!: 'following' | 'interested' | 'negotiating' | 'won' | 'lost';

  @IsEnum(['manual', 'opportunity', 'payment', 'system'])
  triggerType!: 'manual' | 'opportunity' | 'payment' | 'system';

  @IsOptional()
  @IsString()
  reason?: string;
}
