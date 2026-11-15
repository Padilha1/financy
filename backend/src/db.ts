import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from './config.js';
const databaseUrl = new URL(config.DATABASE_URL);
const schema = databaseUrl.searchParams.get('schema') || 'public';
export const prisma = new PrismaClient({
  adapter: new PrismaPg(
    {
      connectionString: config.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
    },
    { schema },
  ),
});
