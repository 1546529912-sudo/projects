import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';

/** JSON 可序列化，与登录接口暴露的用户字段对齐（避免 BigInt 导致 /auth/me 500） */
export type PublicUserProfile = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: string;
  status: string;
  departmentId: string | null;
  lastLoginAt: Date | null;
};

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string): Promise<PublicUserProfile | null> {
    const u = await this.usersRepository.findById(BigInt(id));
    if (!u) return null;
    return {
      id: u.id.toString(),
      name: u.name,
      phone: u.phone,
      email: u.email,
      role: u.role,
      status: u.status,
      departmentId: u.departmentId != null ? u.departmentId.toString() : null,
      lastLoginAt: u.lastLoginAt,
    };
  }
}
