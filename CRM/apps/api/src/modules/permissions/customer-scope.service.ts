import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

interface ScopeUser {
  sub: string;
  role: UserRole | string;
  departmentId?: string | null;
}

@Injectable()
export class CustomerScopeService {
  private isDeptLevel(role: UserRole | string) {
    return role === UserRole.director || role === UserRole.manager;
  }

  buildWhere(user: ScopeUser) {
    if (user.role === UserRole.admin) return {};
    if (this.isDeptLevel(user.role)) {
      return { owner: { departmentId: user.departmentId ? BigInt(user.departmentId) : undefined } };
    }
    return {
      OR: [
        { ownerId: BigInt(user.sub) },
        { collaborators: { some: { userId: BigInt(user.sub) } } },
      ],
    };
  }

  assertCanRead(user: ScopeUser, customer: { ownerId: bigint; owner?: { departmentId?: bigint | null } | null }, collaboratorUserIds?: string[]) {
    if (user.role === UserRole.admin) return;
    if (this.isDeptLevel(user.role)) {
      if (!user.departmentId) throw new ForbiddenException();
      if (customer.owner?.departmentId?.toString() !== user.departmentId) throw new ForbiddenException();
      return;
    }
    if (customer.ownerId.toString() === user.sub) return;
    if (collaboratorUserIds?.includes(user.sub)) return;
    throw new ForbiddenException();
  }

  assertCanWrite(user: ScopeUser, customer: { ownerId: bigint; owner?: { departmentId?: bigint | null } | null }) {
    if (user.role === UserRole.admin) return;
    if (this.isDeptLevel(user.role)) {
      if (!user.departmentId) throw new ForbiddenException();
      if (customer.owner?.departmentId?.toString() !== user.departmentId) throw new ForbiddenException();
      return;
    }
    if (customer.ownerId.toString() !== user.sub) throw new ForbiddenException();
  }
}
