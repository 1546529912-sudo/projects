import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @MaxLength(128)
  name!: string;

  @IsOptional()
  @Matches(/^\d{7,20}$/, { message: '手机号格式不正确' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(128)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  position?: string;

  @IsOptional()
  @IsEnum(['decision_maker', 'influencer', 'user', 'finance', 'unknown'])
  decisionRole?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
