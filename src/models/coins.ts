import Logger from 'js-logger';
import BaseModel from './base-model';

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
}
