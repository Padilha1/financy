import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';

const container = `financy-db-test-${randomBytes(6).toString('hex')}`;
const schema = `test_${randomBytes(8).toString('hex')}`;
let started = false;
let admin;
let code = 0;
function docker(args, env = process.env) {
  const result = spawnSync('docker', args, { env, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Docker test database failed: ${result.stderr}`);
  return result.stdout.trim();
}
try {
  let connection = process.env.TEST_DATABASE_URL;
  if (!connection) {
    const password = randomBytes(24).toString('hex');
    console.info('Starting isolated PostgreSQL test container…');
    docker(
      [
        'run',
        '-d',
        '--rm',
        '--name',
        container,
        '-e',
        'POSTGRES_PASSWORD',
        '-e',
        'POSTGRES_USER=financy_test',
        '-e',
        'POSTGRES_DB=financy_test',
        '-p',
        '127.0.0.1::5432',
        'postgres:17-alpine',
      ],
      { ...process.env, POSTGRES_PASSWORD: password },
    );
    started = true;
    const port = docker(['port', container, '5432/tcp']).split(':').at(-1);
    connection = `postgresql://financy_test:${password}@127.0.0.1:${port}/financy_test`;
  }
  const url = new URL(connection);
  url.searchParams.delete('schema');
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    const client = new pg.Client({
      connectionString: url.toString(),
      connectionTimeoutMillis: 2000,
    });
    try {
      await client.connect();
      admin = client;
      ready = true;
      break;
    } catch {
      await client.end().catch(() => {});
      await delay(200);
    }
  }
  if (!ready)
    throw new Error(
      'PostgreSQL test database unavailable. Start Docker or configure TEST_DATABASE_URL.',
    );
  // Only this random schema is created and dropped. Never use DATABASE_URL implicitly for tests.
  await admin.query(`CREATE SCHEMA "${schema}"`);
  url.searchParams.set('schema', schema);
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    JWT_SECRET: randomBytes(48).toString('hex'),
    DATABASE_URL: url.toString(),
    DIRECT_URL: url.toString(),
  };
  for (const [cmd, args] of [
    ['npm', ['run', 'build']],
    ['npx', ['prisma', 'migrate', 'deploy']],
    ['node', ['--test', 'tests/api.test.mjs', 'tests/logging.test.mjs']],
  ]) {
    const result = spawnSync(cmd, args, { env, stdio: 'inherit' });
    if (result.status !== 0) {
      code = result.status ?? 1;
      break;
    }
  }
} catch {
  console.error(
    'Integration tests could not finish. Check Docker or TEST_DATABASE_URL; database credentials are not printed.',
  );
  code = 1;
} finally {
  if (admin) {
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => {
      code = 1;
    });
    await admin.end();
  }
  if (started) {
    try {
      docker(['stop', container]);
    } catch {
      code = 1;
    }
  }
}
process.exitCode = code;
