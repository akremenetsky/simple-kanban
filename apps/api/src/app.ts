import { STATUS_CODES } from 'node:http';
import Fastify, { type FastifyError } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Db } from './db/client.js';
import { boardRoutes } from './routes/boards.js';
import { healthRoutes } from './routes/health.js';
import { listRoutes } from './routes/lists.js';

export interface AppOptions {
  db: Db;
  logger?: boolean | { level: string };
}

export function buildApp({ db, logger = false }: AppOptions) {
  const app = Fastify({ logger }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.decorate('db', db);

  app.setErrorHandler((err: FastifyError, _req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: err.validation.map((v) => `${v.instancePath || '/'} ${v.message}`).join('; '),
      });
    }
    const statusCode = err.statusCode ?? 500;
    if (statusCode >= 500) app.log.error(err);
    return reply.code(statusCode).send({
      statusCode,
      error: STATUS_CODES[statusCode] ?? 'Error',
      message: statusCode >= 500 ? 'Internal Server Error' : err.message,
    });
  });

  app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(boardRoutes);
      await api.register(listRoutes);
    },
    { prefix: '/api' },
  );

  return app;
}

export type App = ReturnType<typeof buildApp>;

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}
