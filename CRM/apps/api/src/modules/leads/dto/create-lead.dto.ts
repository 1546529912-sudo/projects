import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  contactName?: string;

  @IsOptional()
  @Matches(/^\d{7,20}$/, { message: '手机号格式不正确' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(128)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceCategory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  sourceDetail?: string;
}
