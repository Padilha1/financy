import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import { authChecker } from './auth.js';
import { FinancyResolver } from './resolver.js';
export function createSchema() {
  return buildSchema({ resolvers: [FinancyResolver], authChecker, validate: false });
}
