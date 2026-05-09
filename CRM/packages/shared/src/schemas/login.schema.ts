import { z } from 'zod';

export const loginSchema = z.object({
  account: z.string().trim().min(1, '请输入手机号或邮箱'),
  password: z.string().min(1, '请输入密码'),
});

export type LoginInput = z.infer<typeof loginSchema>;
