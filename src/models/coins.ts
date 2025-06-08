import Logger from 'js-logger';
import BaseModel from './base-model';
import { Coin } from '../external/types';

export default class Coins extends BaseModel {
  constructor() {
    super();
  }

  async set(name: string, decimals: number, maxLeverage: number) {
    this.conn
      .raw(
        `
        INSERT INTO coins (name, decimals, max_leverage) VALUES (?, ?, ?)
        ON CONFLICT DO NOTHING;
        `,
        [name, decimals, maxLeverage],
      )
      .catch(Logger.error);
  }

  async get(): Promise<Coin[]> {
    const result = await this.conn
      .raw(
        `
      SELECT id, name, max_leverage AS "maxLeverage", decimals AS "szDecimals" FROM coins;
    `,
      )
      .catch(Logger.error);

    return result.rows;
  }
}
