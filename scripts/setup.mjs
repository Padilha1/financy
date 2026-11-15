import { existsSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
const root = fileURLToPath(new URL('../', import.meta.url));
for (const dir of ['backend', 'frontend']) {
  const path = `${root}${dir}/.env`;
  if (!existsSync(path)) {
    copyFileSync(`${root}${dir}/.env.example`, path);
    if (dir === 'backend')
      writeFileSync(
        path,
        readFileSync(path, 'utf8').replace(
          'JWT_SECRET=',
          `JWT_SECRET=${randomBytes(48).toString('hex')}`,
        ),
        { mode: 0o600 },
      );
    console.info(`${dir}/.env criado.`);
  }
}
const backendEnv = parse(readFileSync(`${root}backend/.env`));
const dbUrl = process.env.DATABASE_URL || backendEnv.DATABASE_URL;
if (!/^postgres(?:ql)?:/.test(dbUrl || '')) {
  console.error(
    'Configure DATABASE_URL PostgreSQL em backend/.env. O banco SQLite anterior não será alterado.',
  );
  process.exit(1);
}
for (const script of ['db:generate', 'db:migrate'])
  execFileSync('npm', ['run', script, '-w', 'backend'], { cwd: root, stdio: 'inherit' });
console.info('Pronto. Execute npm run dev.');
