import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenBlacklistService } from './token-blacklist.service';
import { ERROR_CODES } from '../../common/types/error-codes';

export interface JwtPayload {
  sub: string;
  role: string;
  departmentId?: string | null;
  jti?: string;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly blacklistService: TokenBlacklistService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'change-me',
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.jti && (await this.blacklistService.isBlacklisted(payload.jti))) {
      throw new UnauthorizedException({ code: ERROR_CODES.UNAUTHORIZED, message: '登录已失效' });
    }
    return payload;
  }
}
