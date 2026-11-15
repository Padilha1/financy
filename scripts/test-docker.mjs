import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const project = `financy-test-${randomBytes(5).toString('hex')}`;
const socket = createServer();
await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise((resolve) => socket.close(resolve));
const dbSocket = createServer();
await new Promise((resolve) => dbSocket.listen(0, '127.0.0.1', resolve));
const dbPort = dbSocket.address().port;
await new Promise((resolve) => dbSocket.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  WEB_PORT: String(port),
  PG_PORT: String(dbPort),
  FRONTEND_URL: origin,
  JWT_SECRET: '',
  LOG_LEVEL: 'info',
};
function compose(args) {
  const result = spawnSync('docker', ['compose', '-p', project, ...args], {
    cwd: root,
    env,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(`docker compose ${args[0]} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
async function graphql(query, variables = {}, token) {
  const response = await fetch(`${origin}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  return { response, ...body };
}
const success = (result) => {
  assert.equal(result.errors, undefined, JSON.stringify(result.errors));
  return result.data;
};
let failed = false;
try {
  console.info('Building and starting an isolated Compose project…');
  compose(['up', '--build', '-d', '--wait', '--wait-timeout', '120']);
  for (const path of ['/', '/cadastro', '/transacoes', '/categorias', '/perfil']) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<div id="root"><\/div>/);
  }
  for (const path of ['/brand/financy-logo.svg', '/brand/financy-icon.svg']) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<svg/);
  }
  assert.equal((await fetch(`${origin}/health`)).status, 200);
  console.info('Frontend routes, original SVGs and proxied health: OK');
  const allowed = await fetch(`${origin}/graphql`, {
    method: 'OPTIONS',
    headers: {
      origin,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'authorization,content-type',
    },
  });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('access-control-allow-origin'), origin);
  const denied = await fetch(`${origin}/graphql`, {
    method: 'OPTIONS',
    headers: { origin: 'https://not-allowed.example', 'access-control-request-method': 'POST' },
  });
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
  const unauthorized = await graphql('{me{id}}');
  assert.equal(unauthorized.errors[0].extensions.code, 'UNAUTHENTICATED');
  console.info('CORS allowlist and private API: OK');
  const register = 'mutation($input:RegisterInput!){register(input:$input){token user{id}}}';
  const password = 'docker-private-password-marker';
  const a = success(
    await graphql(register, {
      input: { name: 'docker-name-marker', email: 'docker-a-marker@example.test', password },
    }),
  ).register;
  const b = success(
    await graphql(register, {
      input: { name: 'docker-b-marker', email: 'docker-b-marker@example.test', password },
    }),
  ).register;
  const c = success(
    await graphql(
      'mutation($input:CategoryInput!){createCategory(input:$input){id}}',
      {
        input: {
          name: 'docker-category-marker',
          description: 'docker-finance-marker',
          color: 'blue',
          icon: 'utensils',
        },
      },
      a.token,
    ),
  ).createCategory;
  success(
    await graphql(
      'mutation($input:TransactionInput!){createTransaction(input:$input){id amount}}',
      {
        input: {
          description: 'docker-transaction-marker',
          amount: 12345,
          date: '2026-11-15',
          type: 'EXPENSE',
          categoryId: c.id,
        },
      },
      a.token,
    ),
  );
  assert.equal(success(await graphql('{transactions{total}}', {}, a.token)).transactions.total, 1);
  assert.equal(success(await graphql('{transactions{total}}', {}, b.token)).transactions.total, 0);
  console.info('Registration, category/transaction creation and user isolation: OK');
  compose(['up', '-d', '--force-recreate', '--wait', '--wait-timeout', '120', 'backend']);
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(`${origin}/health`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(250);
  }
  assert.ok(ready, 'proxy resolves the recreated backend');
  assert.equal(success(await graphql('{me{id}}', {}, a.token)).me.id, a.user.id);
  assert.equal(success(await graphql('{transactions{total}}', {}, a.token)).transactions.total, 1);
  console.info('PostgreSQL and JWT persistence after container recreation: OK');
  const matched = await graphql('{categories{id}}', {}, a.token);
  const requestId = matched.response.headers.get('x-request-id');
  assert.match(requestId, /^[0-9a-f-]{36}$/);
  await delay(100);
  const output = compose(['logs', '--no-color', '--no-log-prefix', 'backend']);
  const rows = output
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.ok(
    rows.some((row) => row.event === 'graphql.operation.completed' && row.requestId === requestId),
  );
  assert.ok(
    rows.some((row) => row.event === 'http.request.completed' && row.requestId === requestId),
  );
  for (const marker of [
    password,
    a.token,
    b.token,
    'docker-name-marker',
    'docker-a-marker@example.test',
    'docker-finance-marker',
    'docker-transaction-marker',
  ])
    assert.ok(!output.includes(marker), `Logs leaked ${marker}`);
  console.info('Structured JSON logs, request correlation and sensitive-data exclusion: OK');
  console.info('All Docker smoke checks passed.');
} catch (error) {
  failed = true;
  console.error(error);
  try {
    console.error(compose(['logs', '--no-color', '--tail', '50']));
  } catch {}
} finally {
  // This random project and its volume contain only data created by this test.
  try {
    compose(['down', '--volumes', '--remove-orphans']);
  } catch (error) {
    failed = true;
    console.error(error);
  }
}
process.exitCode = failed ? 1 : 0;
