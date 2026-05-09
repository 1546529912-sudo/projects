import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { ERROR_CODES } from '../../common/types/error-codes';
import { UsersRepository } from '../users/users.repository';
import { TokenBlacklistService } from './token-blacklist.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly maxFailed = Number(process.env.LOGIN_MAX_FAILED ?? 5);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly blacklistService: TokenBlacklistService,
    private readonly audit: AuditLogService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findByAccount(dto.account.trim());
    if (!user) throw this.invalidCredentialError();
    if (user.status === UserStatus.locked) {
      throw new ForbiddenException({ code: ERROR_CODES.ACCOUNT_LOCKED, message: '账号已锁定，请联系管理员' });
    }
    if (user.status === UserStatus.disabled) {
      throw new ForbiddenException({ code: ERROR_CODES.FORBIDDEN, message: '账号已停用' });
    }

    const matched = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matched) {
      await this.usersRepository.increaseFailedLogin(user.id, this.maxFailed);
      throw this.invalidCredentialError();
    }

    await this.usersRepository.markLoginSuccess(user.id);
    void this.audit.log({
      actorId: user.id.toString(),
      action: 'login',
      resourceType: 'session',
      resourceId: user.id.toString(),
    });
    const jti = randomUUID();
    const accessToken = await this.jwtService.signAsync({
      sub: user.id.toString(),
      role: user.role,
      departmentId: user.departmentId?.toString() ?? null,
      jti,
    });

    return {
      accessToken,
      user: {
        id: user.id.toString(),
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId?.toString() ?? null,
      },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersRepository.findByIdFull(BigInt(userId));
    if (!user) throw new UnauthorizedException('用户不存在');
    const matched = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matched) throw new BadRequestException('当前密码不正确');
    if (newPassword.length < 6) throw new BadRequestException('新密码长度不能少于6位');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.updatePassword(BigInt(userId), hash);
    return { ok: true };
  }

  async logout(tokenPayload: { jti?: string; exp?: number }) {
    if (!tokenPayload.jti || !tokenPayload.exp) return { success: true };
    const ttl = tokenPayload.exp - Math.floor(Date.now() / 1000);
    await this.blacklistService.blacklist(tokenPayload.jti, ttl);
    return { success: true };
  }

  private invalidCredentialError() {
    return new UnauthorizedException({ code: ERROR_CODES.UNAUTHORIZED, message: '账号或密码不正确' });
  }
}
