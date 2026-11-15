import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pino } from 'pino';
const log = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'financy-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: { level: (label) => ({ level: label }) },
});
try {
  // Compose persists its generated key; hosted environments must supply a fixed JWT_SECRET.
  if (!process.env.JWT_SECRET) {
    const secretPath = process.env.JWT_SECRET_FILE;
    if (!secretPath) throw new Error('JWT_SECRET is required');
    mkdirSync(dirname(secretPath), { recursive: true });
    try {
      writeFileSync(secretPath, randomBytes(48).toString('hex'), { flag: 'wx', mode: 0o600 });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    process.env.JWT_SECRET = readFileSync(secretPath, 'utf8').trim();
  }
  if (!/^postgres(?:ql)?:/.test(process.env.DATABASE_URL || ''))
    throw new Error('PostgreSQL connection required');
  log.info({ event: 'database.migration.started' }, 'Applying database migrations');
  const migration = spawnSync(
    process.execPath,
    ['../node_modules/prisma/build/index.js', 'migrate', 'deploy'],
    { env: process.env, stdio: 'pipe' },
  );
  if (migration.status !== 0) {
    log.error(
      { event: 'database.migration.failed', exitCode: migration.status },
      'Database migration failed',
    );
    process.exitCode = 1;
  } else {
    log.info({ event: 'database.migration.completed' }, 'Database migrations applied');
    await import('../dist/server.js');
  }
} catch {
  log.fatal(
    { event: 'server.startup.failed' },
    'API startup failed; check database configuration, JWT secret and volume permissions',
  );
  process.exitCode = 1;
}
