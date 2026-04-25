import { CreateEnvToStoreDto } from '@dtos/envToStore.dto';
import { HttpException } from '@exceptions/HttpException';
import { EnvToStore } from '@interfaces/envToStore.interface';
import EnvToStoreModel from '@models/envToStore.model';
import StoreModel from '@models/stores.model';
import { isEmpty } from '@utils/util';

function plainEnvToStore(row: EnvToStoreModel): EnvToStore {
  const p = row.get({ plain: true }) as EnvToStore & { Store?: unknown; store?: unknown };
  delete p.Store;
  delete p.store;
  return p;
}

class EnvToStoreService {
  public envToStore = EnvToStoreModel;

  private async assertStoreOwnedByUser(storeId: number, userId: number): Promise<void> {
    const store = await StoreModel.findOne({ where: { id: storeId, userId } });
    if (!store) throw new HttpException(409, "Store doesn't exist");
  }

  public async findAllEnvToStores(userId: number): Promise<EnvToStore[]> {
    const rows = await this.envToStore.findAll({
      include: [
        {
          model: StoreModel,
          attributes: [],
          where: { userId },
          required: true,
        },
      ],
    });
    return rows.map(r => plainEnvToStore(r));
  }

  public async findEnvToStoreById(envToStoreId: string, userId: number): Promise<EnvToStore> {
    if (isEmpty(envToStoreId)) throw new HttpException(400, 'EnvToStoreId is empty');

    const id = Number(envToStoreId);
    if (Number.isNaN(id)) throw new HttpException(400, 'EnvToStoreId is invalid');

    const row = await this.envToStore.findOne({
      where: { id },
      include: [
        {
          model: StoreModel,
          attributes: [],
          where: { userId },
          required: true,
        },
      ],
    });
    if (!row) throw new HttpException(409, "Env credentials don't exist");

    return plainEnvToStore(row);
  }

  /** WooCommerce keys for a store; only if the store belongs to userId. */
  public async findEnvToStoreByStoreId(storeId: string, userId: number): Promise<EnvToStore> {
    if (isEmpty(storeId)) throw new HttpException(400, 'StoreId is empty');

    const sid = Number(storeId);
    if (Number.isNaN(sid)) throw new HttpException(400, 'StoreId is invalid');

    const row = await this.envToStore.findOne({
      where: { storeId: sid },
      include: [
        {
          model: StoreModel,
          attributes: [],
          where: { userId },
          required: true,
        },
      ],
    });
    if (!row) throw new HttpException(409, "Env credentials don't exist for this store");

    return plainEnvToStore(row);
  }

  public async createEnvToStore(data: CreateEnvToStoreDto, userId: number): Promise<EnvToStore> {
    if (isEmpty(data)) throw new HttpException(400, 'envToStoreData is empty');

    await this.assertStoreOwnedByUser(data.storeId, userId);

    const existing = await this.envToStore.findOne({ where: { storeId: data.storeId } });
    if (existing) throw new HttpException(409, 'Env credentials already exist for this store');

    const created = await this.envToStore.create({ ...data });
    return plainEnvToStore(created);
  }

  public async updateEnvToStore(envToStoreId: string, data: CreateEnvToStoreDto, userId: number): Promise<EnvToStore> {
    if (isEmpty(data)) throw new HttpException(400, 'envToStoreData is empty');

    const id = Number(envToStoreId);
    if (Number.isNaN(id)) throw new HttpException(400, 'EnvToStoreId is invalid');

    const row = await this.envToStore.findOne({
      where: { id },
      include: [
        {
          model: StoreModel,
          attributes: [],
          where: { userId },
          required: true,
        },
      ],
    });
    if (!row) throw new HttpException(409, "Env credentials don't exist");

    if (data.storeId !== undefined && data.storeId !== row.storeId) {
      await this.assertStoreOwnedByUser(data.storeId, userId);
      const taken = await this.envToStore.findOne({ where: { storeId: data.storeId } });
      if (taken && taken.id !== row.id) throw new HttpException(409, 'Env credentials already exist for that store');
    }

    await row.update({
      ...(data.storeId !== undefined && { storeId: data.storeId }),
      ...(data.consumerKey !== undefined && { consumerKey: data.consumerKey }),
      ...(data.consumerSecret !== undefined && { consumerSecret: data.consumerSecret }),
    });

    await row.reload();
    return plainEnvToStore(row);
  }

  public async deleteEnvToStore(envToStoreId: string, userId: number): Promise<EnvToStore> {
    const id = Number(envToStoreId);
    if (Number.isNaN(id)) throw new HttpException(400, 'EnvToStoreId is invalid');

    const row = await this.envToStore.findOne({
      where: { id },
      include: [
        {
          model: StoreModel,
          attributes: [],
          where: { userId },
          required: true,
        },
      ],
    });
    if (!row) throw new HttpException(409, "Env credentials don't exist");

    const plain = plainEnvToStore(row);
    await row.destroy();
    return plain;
  }
}

export default EnvToStoreService;
