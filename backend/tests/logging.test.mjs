import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { createLogger } from '../dist/logger.js';

async function freePort() {
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

test('logger redacts sensitive fields and writes JSON with an ISO timestamp', () => {
  let output = '';
  const destination = new Writable({
    write(chunk, _encoding, done) {
      output += chunk.toString();
      done();
    },
  });
  const log = createLogger('info', destination);
  log.info(
    {
      event: 'test.safe',
      requestId: 'request-123',
      password: 'secret-marker',
      token: 'token-marker',
      email: 'email-marker',
      description: 'finance-marker',
      amount: 123456,
      variables: { nested: 'variables-marker' },
      req: { headers: { authorization: 'auth-marker' } },
      input: { password: 'nested-secret', description: 'nested-finance' },
    },
    'Safe message',
  );
  const row = JSON.parse(output);
  assert.equal(row.level, 'info');
  assert.equal(row.service, 'financy-api');
  assert.equal(row.requestId, 'request-123');
  assert.ok(!Number.isNaN(Date.parse(row.time)));
  for (const marker of [
    'secret-marker',
    'token-marker',
    'email-marker',
    'finance-marker',
    'variables-marker',
    'auth-marker',
    'nested-secret',
    'nested-finance',
    '123456',
  ])
    assert.ok(!output.includes(marker), marker);
});

test('HTTP and GraphQL logs correlate failures without leaking bodies, URLs or credentials', async () => {
  const port = await freePort();
  let stdout = '';
  let stderr = '';
  const server = spawn(process.execPath, ['dist/server.js'], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      LOG_LEVEL: 'info',
      FRONTEND_URL: 'http://localhost:5173',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  const ended = new Promise((resolve) => server.once('exit', (code) => resolve(code)));
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null) assert.fail(`Server exited: ${stderr}`);
      try {
        if ((await fetch(`${base}/health`)).ok) {
          ready = true;
          break;
        }
      } catch {}
      await delay(50);
    }
    assert.ok(ready, 'server starts');
    const unauthorized = await fetch(`${base}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-request-id': 'untrusted-marker' },
      body: JSON.stringify({
        query: 'query ClientOperationMarker { categories { id } }',
        variables: { unused: 'variables-marker' },
      }),
    });
    const requestId = unauthorized.headers.get('x-request-id');
    assert.match(requestId, /^[0-9a-f-]{36}$/);
    assert.notEqual(requestId, 'untrusted-marker');
    assert.equal((await unauthorized.json()).errors[0].extensions.code, 'UNAUTHENTICATED');
    const account = await fetch(`${base}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'mutation($input:RegisterInput!){register(input:$input){token user{id}}}',
        variables: {
          input: {
            name: 'name-marker',
            email: 'logging-marker@example.test',
            password: 'password-marker-123',
          },
        },
      }),
    });
    const payload = await account.json();
    assert.ok(payload.data?.register.token, JSON.stringify(payload.errors));
    const malformed = await fetch(`${base}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"password":"malformed-marker",',
    });
    assert.equal(malformed.status, 400);
    await malformed.text();
    const missing = await fetch(`${base}/private-path-marker?token=query-secret-marker`, {
      headers: { authorization: 'Bearer header-secret-marker' },
    });
    assert.equal(missing.status, 404);
    await missing.text();
    await delay(100);
    const rows = stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    const http = rows.find(
      (row) => row.event === 'http.request.completed' && row.requestId === requestId,
    );
    const graphql = rows.find(
      (row) => row.event === 'graphql.operation.completed' && row.requestId === requestId,
    );
    assert.ok(http);
    assert.equal(http.statusCode, 200);
    assert.equal(http.route, '/graphql');
    assert.ok(graphql);
    assert.equal(graphql.level, 'warn');
    assert.equal(graphql.operationType, 'query');
    assert.deepEqual(graphql.errorCodes, ['UNAUTHENTICATED']);
    assert.ok(rows.some((row) => row.event === 'http.middleware.failed' && row.statusCode === 400));
    assert.ok(rows.some((row) => row.route === 'unmatched' && row.statusCode === 404));
    for (const marker of [
      'ClientOperationMarker',
      'untrusted-marker',
      'variables-marker',
      'name-marker',
      'logging-marker@example.test',
      'password-marker-123',
      'malformed-marker',
      'private-path-marker',
      'query-secret-marker',
      'header-secret-marker',
      payload.data.register.token,
    ])
      assert.ok(!stdout.includes(marker), marker);
    assert.equal(stderr, '');
  } finally {
    server.kill('SIGTERM');
    await Promise.race([
      ended,
      delay(5000).then(() => {
        server.kill('SIGKILL');
      }),
    ]);
  }
  assert.ok(stdout.includes('server.stopped'));
});
