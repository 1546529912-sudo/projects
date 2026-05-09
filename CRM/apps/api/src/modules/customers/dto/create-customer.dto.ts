import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  shortName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  primaryContactName?: string;

  @IsOptional()
  @Matches(/^\d{7,20}$/, { message: '手机号格式不正确' })
  primaryPhone?: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(128)
  primaryEmail?: string;

  @IsOptional()
  @IsEnum(['A', 'B', 'C', 'D'])
  level?: 'A' | 'B' | 'C' | 'D';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceCategory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  sourceDetail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  companySize?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  region?: string;

  @IsOptional()
  ownerId?: number;

  @IsOptional()
  customFields?: Record<string, any>;
}
