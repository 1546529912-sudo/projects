import { UserRole } from '@prisma/client';

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    role: UserRole;
    departmentId: string | null;
  };
}
