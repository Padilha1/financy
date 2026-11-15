import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createServer } from 'node:http';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@as-integrations/express5';
import depthLimit from 'graphql-depth-limit';
import { config } from './config.js';
import { contextFor, type Context } from './auth.js';
import { createSchema } from './schema.js';
import { prisma } from './db.js';
import { createLogger, errorLogging, operationLogging, requestLogging } from './logger.js';

const log = createLogger(config.LOG_LEVEL);
const app = express();
if (config.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use(requestLogging(log));
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: config.NODE_ENV === 'production' ? undefined : false }));
const httpServer = createServer(app);
const server = new ApolloServer<Context>({
  schema: await createSchema(),
  logger: {
    debug: () => {},
    info: () => {},
    warn: () => log.warn({ event: 'graphql.server.warning' }, 'GraphQL server warning'),
    error: () => log.error({ event: 'graphql.server.error' }, 'GraphQL server error'),
  },
  validationRules: [depthLimit(8)],
  introspection: config.NODE_ENV !== 'production',
  includeStacktraceInErrorResponses: false,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer }), operationLogging(log)],
  formatError: (formatted) =>
    formatted.extensions?.code === 'INTERNAL_SERVER_ERROR'
      ? {
          message: 'Não foi possível concluir a operação. Tente novamente.',
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        }
      : formatted,
});
await server.start();
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});
app.use(
  '/graphql',
  cors({ origin: config.origins, exposedHeaders: ['X-Request-Id'] }),
  rateLimit({
    windowMs: 60_000,
    limit: 180,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { errors: [{ message: 'Muitas tentativas. Aguarde um minuto.' }] },
  }),
  express.json({ limit: '32kb' }),
  expressMiddleware(server, {
    context: async ({ req, res }) => ({
      ...(await contextFor(req.headers.authorization)),
      requestId: res.locals.requestId as string,
    }),
  }),
);
app.use(errorLogging(log));
await new Promise<void>((resolve, reject) => {
  httpServer.once('error', reject);
  httpServer.listen(config.PORT, config.HOST, resolve);
});
log.info({ event: 'server.started', host: config.HOST, port: config.PORT }, 'Financy API started');
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  log.info({ event: 'server.stopping' }, 'Financy API stopping');
  try {
    await server.stop();
    await prisma.$disconnect();
    log.info({ event: 'server.stopped' }, 'Financy API stopped');
    process.exitCode = 0;
  } catch {
    log.error({ event: 'server.shutdown.failed' }, 'Financy API shutdown failed');
    process.exitCode = 1;
  }
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
