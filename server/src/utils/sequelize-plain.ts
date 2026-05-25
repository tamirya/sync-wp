import type { Model } from 'sequelize';

/**
 * Serialize a Sequelize model for JSON responses.
 * Avoids TypeScript `public field!` declarations shadowing `get({ plain: true })`.
 */
export function modelToPlain<T extends Record<string, unknown> = Record<string, unknown>>(instance: Model): T {
  return { ...(instance.dataValues as T) };
}

export function modelsToPlain<T extends Record<string, unknown> = Record<string, unknown>>(instances: Model[]): T[] {
  return instances.map(instance => modelToPlain<T>(instance));
}
