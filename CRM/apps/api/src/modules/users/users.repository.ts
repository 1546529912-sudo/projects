import { Injectable } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByAccount(account: string) {
    return this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ phone: account }, { email: account }],
      },
    });
  }

  findById(id: bigint) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
        lastLoginAt: true,
      },
    });
  }

  findByIdFull(id: bigint) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  updatePassword(id: bigint, passwordHash: string) {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async increaseFailedLogin(id: bigint, maxFailed: number) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { failedLoginCount: { increment: 1 } },
    });
    if (user.failedLoginCount >= maxFailed) {
      return this.prisma.user.update({
        where: { id },
        data: { status: UserStatus.locked, lockedAt: new Date() },
      });
    }
    return user;
  }

  markLoginSuccess(id: bigint) {
    return this.prisma.user.update({
      where: { id },
      data: { failedLoginCount: 0, lockedAt: null, lastLoginAt: new Date() },
    });
  }
}
