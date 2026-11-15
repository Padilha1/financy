import 'dotenv/config';
import { z } from 'zod';
const env = z
  .object({
    JWT_SECRET: z.string().min(32, 'JWT_SECRET deve conter pelo menos 32 caracteres.'),
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (value) => ['postgresql:', 'postgres:'].includes(new URL(value).protocol),
        'DATABASE_URL deve ser uma conexão PostgreSQL.',
      ),
    HOST: z.string().min(1).default('127.0.0.1'),
    TRUST_PROXY: z.enum(['0', '1']).default('0'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    FRONTEND_URL: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  })
  .parse(process.env);
export const config = { ...env, origins: env.FRONTEND_URL.split(',').map((s) => s.trim()) };
