import type { Model } from 'sequelize';

/** Plain object from Sequelize `dataValues` (avoids public class-field shadowing). */
export function modelToPlain<T extends object>(instance: Model): T {
  return { ...instance.dataValues } as T;
}

export function modelsToPlain<T extends object>(instances: Model[]): T[] {
  return instances.map(instance => modelToPlain<T>(instance));
}
