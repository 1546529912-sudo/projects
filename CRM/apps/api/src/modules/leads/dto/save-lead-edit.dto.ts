import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreateLeadDto } from './create-lead.dto';

/** 编辑保存：id 放在 body，路径为静态 POST /leads/save-edit，避免与 :id 路由匹配冲突 */
export class SaveLeadEditDto extends PartialType(CreateLeadDto) {
  @IsString()
  @IsNotEmpty({ message: '缺少线索 id' })
  id!: string;
}
