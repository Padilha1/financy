import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { pino, type DestinationStream, type Logger } from 'pino';
import type { RequestHandler, ErrorRequestHandler } from 'express';
import type { ApolloServerPlugin } from '@apollo/server';
import type { Context } from './auth.js';

// The application emits allowlisted metadata only. Redaction is a second line of defense.
export function createLogger(level = 'info', destination?: DestinationStream) {
  return pino(
    {
      level,
      base: { service: 'financy-api' },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
      redact: {
        paths: [
          'password',
          'passwordHash',
          'token',
          'authorization',
          'cookie',
          'secret',
          'JWT_SECRET',
          'DATABASE_URL',
          'DIRECT_URL',
          '*.DATABASE_URL',
          '*.DIRECT_URL',
          'email',
          'name',
          'description',
          'amount',
          'body',
          'variables',
          'query',
          'req',
          'res',
          'err',
          '*.password',
          '*.passwordHash',
          '*.token',
          '*.authorization',
          '*.cookie',
          '*.secret',
          '*.JWT_SECRET',
          '*.email',
          '*.description',
          '*.amount',
          '*.body',
          '*.variables',
          '*.query',
        ],
        remove: true,
      },
    },
    destination,
  );
}

export function requestLogging(log: Logger): RequestHandler {
  return (req, res, next) => {
    const requestId = randomUUID();
    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    const started = performance.now();
    // Never log a raw URL: a query string or an arbitrary path can contain personal data.
    const route =
      req.path === '/graphql' ? '/graphql' : req.path === '/health' ? '/health' : 'unmatched';
    let completed = false;
    const finish = (aborted: boolean) => {
      if (completed) return;
      completed = true;
      if (route === '/health' && res.statusCode < 400 && !aborted) return;
      const metadata = {
        event: aborted ? 'http.request.aborted' : 'http.request.completed',
        requestId,
        method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(req.method)
          ? req.method
          : 'OTHER',
        route,
        statusCode: res.statusCode,
        durationMs: Math.round((performance.now() - started) * 100) / 100,
      };
      if (aborted || res.statusCode >= 500) log.error(metadata, 'HTTP request failed');
      else if (res.statusCode >= 400) log.warn(metadata, 'HTTP request rejected');
      else log.info(metadata, 'HTTP request completed');
    };
    res.once('finish', () => finish(false));
    res.once('close', () => {
      if (!res.writableFinished) finish(true);
    });
    next();
  };
}

const publicCodes = new Set([
  'BAD_USER_INPUT',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'GRAPHQL_PARSE_FAILED',
  'GRAPHQL_VALIDATION_FAILED',
  'PERSISTED_QUERY_NOT_FOUND',
  'PERSISTED_QUERY_NOT_SUPPORTED',
]);
export function operationLogging(log: Logger): ApolloServerPlugin<Context> {
  return {
    async requestDidStart() {
      const started = performance.now();
      let operationType = 'unknown';
      return {
        async didResolveOperation({ operation }) {
          operationType = operation?.operation ?? 'unknown';
        },
        async willSendResponse({ contextValue, errors }) {
          const errorCodes = [
            ...new Set(
              (errors ?? []).map((error) => {
                const code = error.extensions?.code;
                return typeof code === 'string' && publicCodes.has(code)
                  ? code
                  : 'INTERNAL_SERVER_ERROR';
              }),
            ),
          ];
          const metadata = {
            event: 'graphql.operation.completed',
            requestId: contextValue.requestId,
            operationType,
            durationMs: Math.round((performance.now() - started) * 100) / 100,
            errorCount: errors?.length ?? 0,
            errorCodes,
          };
          if (errorCodes.includes('INTERNAL_SERVER_ERROR'))
            log.error(metadata, 'GraphQL operation failed');
          else if (errorCodes.length) log.warn(metadata, 'GraphQL operation rejected');
          else log.info(metadata, 'GraphQL operation completed');
        },
      };
    },
  };
}

export function errorLogging(log: Logger): ErrorRequestHandler {
  return (error: unknown, _req, res, _next) => {
    const status =
      typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
    const statusCode = status === 400 || status === 413 ? status : 500;
    const metadata = {
      event: 'http.middleware.failed',
      requestId: res.locals.requestId,
      statusCode,
    };
    if (statusCode >= 500) log.error(metadata, 'HTTP middleware failed');
    else log.warn(metadata, 'HTTP request rejected');
    if (!res.headersSent)
      res.status(statusCode).json({
        errors: [
          {
            message:
              statusCode === 413
                ? 'Requisição muito grande.'
                : statusCode === 400
                  ? 'Requisição inválida.'
                  : 'Não foi possível concluir a operação.',
          },
        ],
      });
    else res.end();
  };
}
