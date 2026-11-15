import { z } from 'zod';
import { fail } from './auth.js';
export const colors = ['blue', 'purple', 'pink', 'red', 'orange', 'yellow', 'green'] as const;
export const icons = [
  'briefcase',
  'car',
  'utensils',
  'shopping-cart',
  'ticket',
  'piggy-bank',
  'house',
  'heart',
  'graduation-cap',
  'gift',
  'plane',
  'wallet',
  'coffee',
  'dumbbell',
  'smartphone',
  'receipt',
] as const;
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Informe um e-mail válido.')
  .max(254);
export const passwordSchema = z
  .string()
  .min(8, 'A senha deve conter pelo menos 8 caracteres.')
  .max(72, 'A senha pode ter até 72 caracteres.')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'A senha pode ter até 72 bytes.');
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome completo.').max(100),
  email: emailSchema,
  password: passwordSchema,
});
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(200) });
export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Informe o título.').max(50),
  description: z.string().trim().max(200),
  color: z.enum(colors),
  icon: z.enum(icons),
});
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T12:00:00Z`);
    return (
      !Number.isNaN(d.getTime()) &&
      d.toISOString().slice(0, 10) === v &&
      v >= '1900-01-01' &&
      v <= '2100-12-31'
    );
  }, 'Informe uma data válida entre 1900 e 2100.');
export const transactionSchema = z.object({
  description: z.string().trim().min(1, 'Informe a descrição.').max(150),
  amount: z
    .number()
    .int()
    .positive('O valor deve ser maior que zero.')
    .max(100_000_000, 'O valor máximo é R$ 1.000.000,00.'),
  type: z.enum(['INCOME', 'EXPENSE']),
  date: dateSchema,
  categoryId: z.string().uuid(),
});
export const filterSchema = z.object({
  search: z.string().trim().max(150).optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  categoryId: z.string().uuid().optional(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
});
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) fail(result.error.issues[0]?.message ?? 'Dados inválidos.');
  return result.data;
}
