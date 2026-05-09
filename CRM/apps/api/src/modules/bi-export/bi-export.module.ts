import { Module } from '@nestjs/common';
import { BiExportController } from './bi-export.controller';
import { PrismaModule } from '../../infra/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BiExportController],
})
export class BiExportModule {}
