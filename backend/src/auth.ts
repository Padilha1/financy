import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';
import type { AuthChecker } from 'type-graphql';
import { config } from './config.js';
import { prisma } from './db.js';
export interface Context {
  userId: string | null;
  requestId?: string;
}
export function issueToken(userId: string) {
  return jwt.sign({}, config.JWT_SECRET, {
    subject: userId,
    expiresIn: '7d',
    issuer: 'financy',
    audience: 'financy-web',
  });
}
export async function contextFor(authorization?: string): Promise<Context> {
  if (!authorization?.startsWith('Bearer ')) return { userId: null };
  try {
    const payload = jwt.verify(authorization.slice(7), config.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'financy',
      audience: 'financy-web',
    });
    if (typeof payload === 'string' || !payload.sub) return { userId: null };
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true } });
    return { userId: user?.id ?? null };
  } catch {
    return { userId: null };
  }
}
export const authChecker: AuthChecker<Context> = ({ context }) => {
  if (!context.userId)
    throw new GraphQLError('Sua sessão expirou. Entre novamente.', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  return true;
};
export function fail(message: string, code = 'BAD_USER_INPUT'): never {
  throw new GraphQLError(message, { extensions: { code } });
}
